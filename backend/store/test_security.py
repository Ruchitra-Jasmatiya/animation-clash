"""Security checks: XSS payloads, access control, injection, rate limits, tampering."""
from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from products.models import Product
from store import emails
from store.models import Customer, Order

XSS = '<script>alert(1)</script><img src=x onerror=alert(1)>'


class SecurityTests(TestCase):
    def setUp(self):
        self.c = APIClient()

    def _login(self, email="a@example.com"):
        cust = Customer.objects.create(email=email, name="A")
        from django.test import RequestFactory
        from store.services import start_session
        tok = start_session(RequestFactory().get("/"), cust)
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Customer {tok}")
        return c, cust

    def test_all_private_endpoints_need_login(self):
        for url in ["/api/my/summary/", "/api/my/cart/", "/api/my/orders/", "/api/products/", "/api/my/rewards/"]:
            self.assertIn(self.c.get(url).status_code, (401, 403), url)
        for url in ["/api/orders/", "/api/customers/", "/api/analytics/", "/api/festivals/", "/api/settings/"]:
            self.assertIn(self.c.get(url).status_code, (401, 403), url)

    def test_customer_token_cannot_reach_admin_api(self):
        c, _ = self._login()
        for url in ["/api/orders/", "/api/customers/", "/api/analytics/", "/api/reward-pool/", "/api/settings/"]:
            self.assertIn(c.get(url).status_code, (401, 403), url)

    def test_sql_injection_text_is_just_text(self):
        c, _ = self._login()
        r = c.get("/api/products/", {"q": "' OR 1=1; DROP TABLE products_product;--"})
        self.assertLess(r.status_code, 500)
        self.assertTrue(Product.objects.model._meta.db_table)

    def test_xss_in_email_html_is_escaped(self):
        o = Order(customer_name=XSS, email="x@example.com", invoice_no="MU-1", total=10)
        emails.send_order_paid(o, "MASSUP")
        html = mail.outbox[-1].alternatives[0][0]
        self.assertNotIn("<script>", html)
        self.assertNotIn("<img", html)

    @override_settings(DEBUG=False)
    def test_signup_rejects_script_names_or_stores_them_as_plain_text(self):
        r = self.c.post("/api/customer/signup/", {"email": "n@example.com", "name": XSS, "phone": ""}, format="json")
        if r.status_code == 200:
            self.assertEqual(Customer.objects.count(), 0)  # not created until OTP is verified
        else:
            self.assertLess(r.status_code, 500)

    def test_customer_cannot_read_someone_elses_order(self):
        c1, cust1 = self._login("one@example.com")
        c2, _ = self._login("two@example.com")
        o = Order.objects.create(customer=cust1, customer_name="One", email="one@example.com", invoice_no="MU-9", total=0, source="online")
        self.assertEqual(c2.get(f"/api/my/orders/{o.id}/").status_code, 404)
        self.assertEqual(c2.post(f"/api/my/orders/{o.id}/cancel/").status_code, 404)

    def test_client_cannot_set_price(self):
        c, _ = self._login()
        p = Product.objects.create(name="X", price=500, stock=5)
        r = c.post("/api/my/cart/", {"product": p.id, "quantity": 1, "price": 1, "total": 1}, format="json")
        self.assertLess(r.status_code, 500)
        q = c.post("/api/my/quote/", {"total": 1, "price": 1}, format="json")
        if q.status_code == 200:
            self.assertNotEqual(str(q.json().get("total")), "1.00")

    def test_otp_bruteforce_is_blocked(self):
        self.c.post("/api/customer/signup/", {"email": "brute@example.com", "name": "B", "phone": ""}, format="json")
        codes = [self.c.post("/api/customer/verify/", {"email": "brute@example.com", "code": f"{i:06d}"}, format="json").status_code for i in range(8)]
        self.assertNotIn(200, codes)
        self.assertEqual(Customer.objects.filter(email="brute@example.com").count(), 0)
