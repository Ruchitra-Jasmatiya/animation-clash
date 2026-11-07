import io
import shutil
import tempfile
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from products.models import Product
from store.models import AuditLog, Coupon, LoginAttempt, Order, StoreSettings

TMP = tempfile.mkdtemp()
PW = "Str0ng-Pass-9137!"


def png(name="a.png"):
    b = io.BytesIO()
    Image.new("RGB", (6, 6), (1, 2, 3)).save(b, "PNG")
    return SimpleUploadedFile(name, b.getvalue(), content_type="image/png")


@override_settings(MEDIA_ROOT=TMP)
class StoreApiTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TMP, ignore_errors=True)

    def setUp(self):
        cache.clear()  # rate-limit counters live in the cache
        U = get_user_model()
        self.staff = U.objects.create_user("boss", password=PW, is_staff=True)
        self.cust = U.objects.create_user("cust", password=PW)
        self.p1 = Product.objects.create(name="Jar", price=Decimal("1000"), image_url="https://e.com/a.jpg")
        self.p2 = Product.objects.create(name="Mini", price=Decimal("250.50"), image_url="https://e.com/b.jpg")

    def login(self, user="boss"):
        r = self.client.post("/api/auth/login/", {"username": user, "password": PW})
        self.assertEqual(r.status_code, 200, r.data)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + r.data["token"])
        return r.data["token"]

    # ---------- who can do what ----------
    def test_admin_endpoints_reject_anonymous_and_non_staff(self):
        for url in ["/api/orders/", "/api/coupons/", "/api/dashboard/", "/api/logs/", "/api/settings/"]:
            self.assertEqual(self.client.get(url).status_code, 401, url)
        self.assertEqual(self.client.put("/api/site-media/hero_video/", {"url": "https://e.com/v.mp4"}, format="json").status_code, 401)
        tok = Token.objects.create(user=self.cust)  # a customer token must never work
        self.client.credentials(HTTP_AUTHORIZATION="Token " + tok.key)
        self.assertIn(self.client.get("/api/orders/").status_code, (401, 403))

    def test_public_can_read_site_media_but_not_change_it(self):
        r = self.client.get("/api/site-media/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(any(x["slot"] == "hero_video" and x["url"] is None for x in r.data))

    # ---------- login security ----------
    def test_login_is_logged_and_lockout_after_5_failures(self):
        for _ in range(5):
            self.assertEqual(self.client.post("/api/auth/login/", {"username": "boss", "password": "nope"}).status_code, 400)
        r = self.client.post("/api/auth/login/", {"username": "boss", "password": PW})
        self.assertEqual(r.status_code, 429)
        self.assertEqual(LoginAttempt.objects.filter(username="boss", success=False, blocked=False).count(), 5)
        self.assertTrue(LoginAttempt.objects.filter(blocked=True).exists())

    def test_successful_login_recorded_and_visible_in_logs(self):
        self.login()
        self.assertTrue(LoginAttempt.objects.filter(username="boss", success=True).exists())
        r = self.client.get("/api/logs/?type=logins")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["rows"][0]["username"], "boss")

    def test_new_login_replaces_old_token(self):
        t1 = self.login()
        t2 = self.login()
        self.assertNotEqual(t1, t2)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + t1)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_token_expires(self):
        tok = self.login()
        Token.objects.filter(key=tok).update(created=timezone.now() - timedelta(hours=13))
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_change_password(self):
        self.login()
        self.assertEqual(self.client.post("/api/auth/change-password/", {"current_password": "bad", "new_password": "Another-Str0ng-1!"}).status_code, 400)
        self.assertEqual(self.client.post("/api/auth/change-password/", {"current_password": PW, "new_password": "123"}).status_code, 400)
        r = self.client.post("/api/auth/change-password/", {"current_password": PW, "new_password": "Another-Str0ng-1!"})
        self.assertEqual(r.status_code, 200)
        self.client.credentials()
        self.assertEqual(self.client.post("/api/auth/login/", {"username": "boss", "password": "Another-Str0ng-1!"}).status_code, 200)

    # ---------- audit trail ----------
    def test_changes_are_audited(self):
        self.login()
        self.client.post("/api/products/", {"name": "New", "price": "5", "image_url": "https://e.com/n.jpg"}, format="json")
        self.client.post("/api/coupons/", {"code": "hello10", "discount_type": "percent", "value": "10"}, format="json")
        acts = list(AuditLog.objects.values_list("target", "user"))
        self.assertIn(("product", "boss"), acts)
        self.assertIn(("coupon", "boss"), acts)
        r = self.client.get("/api/logs/?type=activity")
        self.assertTrue(len(r.data) >= 2)

    # ---------- products ----------
    def test_mrp_must_not_be_below_price(self):
        self.login()
        r = self.client.post("/api/products/", {"name": "X", "price": "100", "mrp": "50", "image_url": "https://e.com/x.jpg"}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.client.post("/api/products/", {"name": "X", "price": "100", "mrp": "150", "image_url": "https://e.com/x.jpg"}, format="json")
        self.assertEqual(r.status_code, 201)

    # ---------- coupons ----------
    def test_coupon_rules(self):
        c = Coupon.objects.create(code="SAVE10", discount_type="percent", value=10, min_order=500, max_discount=50)
        self.assertEqual(c.evaluate(Decimal("1000"))[2], Decimal("50.00"))   # capped
        self.assertFalse(c.evaluate(Decimal("100"))[0])                        # below minimum
        c.expires_at = timezone.now() - timedelta(days=1)
        self.assertFalse(c.evaluate(Decimal("1000"))[0])                       # expired
        c2 = Coupon.objects.create(code="FLAT", discount_type="flat", value=300)
        self.assertEqual(c2.evaluate(Decimal("200"))[2], Decimal("200.00"))    # never more than subtotal
        c3 = Coupon.objects.create(code="ONCE", discount_type="flat", value=10, usage_limit=1, used_count=1)
        self.assertFalse(c3.evaluate(Decimal("100"))[0])

    def test_coupon_validate_endpoint_is_public(self):
        Coupon.objects.create(code="SAVE10", discount_type="percent", value=10)
        r = self.client.post("/api/coupons/validate/", {"code": "save10", "subtotal": "200"}, format="json")
        self.assertTrue(r.data["valid"]); self.assertEqual(r.data["discount"], "20.00")
        r = self.client.post("/api/coupons/validate/", {"code": "nope", "subtotal": "200"}, format="json")
        self.assertFalse(r.data["valid"])

    def test_coupon_code_validation(self):
        self.login()
        for code in ["ab", "has space", "x" * 41, "bad!"]:
            r = self.client.post("/api/coupons/", {"code": code, "discount_type": "flat", "value": "5"}, format="json")
            self.assertEqual(r.status_code, 400, code)
        r = self.client.post("/api/coupons/", {"code": "pct", "discount_type": "percent", "value": "150"}, format="json")
        self.assertEqual(r.status_code, 400)

    # ---------- billing ----------
    def order(self, **extra):
        body = {"customer_name": "Asha", "phone": "9999999999", "payment_method": "upi",
                "lines": [{"product": self.p1.id, "quantity": 2}, {"product": self.p2.id, "quantity": 1}]}
        body.update(extra)
        return self.client.post("/api/orders/", body, format="json")

    def test_invoice_totals_use_database_prices_not_client_prices(self):
        self.login()
        r = self.order()
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["subtotal"], "2250.50")
        self.assertEqual(r.data["total"], "2250.50")
        self.assertTrue(r.data["invoice_no"].startswith("MU-"))
        self.assertEqual(len(r.data["items"]), 2)

    def test_coupon_shipping_and_inclusive_gst(self):
        s = StoreSettings.load(); s.gst_percent = Decimal("5"); s.shipping_fee = Decimal("80"); s.free_shipping_above = Decimal("5000"); s.save()
        Coupon.objects.create(code="TEN", discount_type="percent", value=10)
        self.login()
        r = self.order(coupon_code="ten")
        self.assertEqual(r.status_code, 201, r.data)
        # subtotal 2250.50, discount 225.05 -> 2025.45 + shipping 80 = 2105.45 ; GST inside price: 2025.45*5/105
        self.assertEqual(r.data["discount"], "225.05")
        self.assertEqual(r.data["shipping"], "80.00")
        self.assertEqual(r.data["tax"], "96.45")
        self.assertEqual(r.data["total"], "2105.45")
        self.assertEqual(Coupon.objects.get(code="TEN").used_count, 1)

    def test_exclusive_gst_adds_to_total(self):
        s = StoreSettings.load(); s.gst_percent = Decimal("18"); s.prices_include_gst = False; s.save()
        self.login()
        r = self.order(lines=[{"product": self.p1.id, "quantity": 1}])
        self.assertEqual(r.data["tax"], "180.00"); self.assertEqual(r.data["total"], "1180.00")

    def test_free_shipping_threshold(self):
        s = StoreSettings.load(); s.shipping_fee = Decimal("99"); s.free_shipping_above = Decimal("2000"); s.save()
        self.login()
        self.assertEqual(self.order().data["shipping"], "0.00")

    def test_bad_orders_rejected(self):
        self.login()
        self.assertEqual(self.order(lines=[]).status_code, 400)
        self.assertEqual(self.order(lines=[{"product": self.p1.id, "quantity": 0}]).status_code, 400)
        self.assertEqual(self.order(lines=[{"name": "Custom", "quantity": 1}]).status_code, 400)  # no price
        self.assertEqual(self.order(coupon_code="DOESNOTEXIST").status_code, 400)
        self.assertEqual(self.order(customer_name="   ").status_code, 400)

    def test_custom_line_and_preview(self):
        self.login()
        r = self.client.post("/api/orders/preview/", {"lines": [{"name": "Delivery gift", "unit_price": "100", "quantity": 3}]}, format="json")
        self.assertEqual(r.data["total"], "300.00")
        self.assertEqual(Order.objects.count(), 0)  # preview never saves

    def test_cancel_returns_coupon_use_and_totals_cannot_be_edited(self):
        Coupon.objects.create(code="TEN", discount_type="percent", value=10)
        self.login()
        oid = self.order(coupon_code="TEN").data["id"]
        r = self.client.patch(f"/api/orders/{oid}/", {"status": "cancelled", "total": "1"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertNotEqual(r.data["total"], "1.00")
        self.assertEqual(Coupon.objects.get(code="TEN").used_count, 0)
        r = self.client.patch(f"/api/orders/{oid}/", {"lines": [{"product": self.p1.id, "quantity": 1}]}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_dashboard(self):
        self.login()
        oid = self.order().data["id"]
        self.client.patch(f"/api/orders/{oid}/", {"status": "paid"}, format="json")
        r = self.client.get("/api/dashboard/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["orders"], 1); self.assertEqual(len(r.data["daily"]), 14)
        self.assertEqual(r.data["top_products"][0]["name"], "Jar")

    # ---------- site media ----------
    def test_media_url_upload_reset_and_validation(self):
        self.login()
        r = self.client.put("/api/site-media/hero_video/", {"url": "https://cdn.e.com/v.mp4"}, format="json")
        self.assertEqual(r.status_code, 200); self.assertEqual(r.data["url"], "https://cdn.e.com/v.mp4")
        self.assertEqual(self.client.put("/api/site-media/hero_video/", {"url": "javascript:alert(1)"}, format="json").status_code, 400)
        self.assertEqual(self.client.put("/api/site-media/nope/", {"url": "https://e.com/x.jpg"}, format="json").status_code, 400)
        r = self.client.put("/api/site-media/gallery_1/", {"file": png()}, format="multipart")
        self.assertEqual(r.status_code, 200, r.data); self.assertTrue(r.data["url"].startswith("/media/site/"))
        bad = SimpleUploadedFile("evil.svg", b"<svg onload=alert(1)/>", content_type="image/svg+xml")
        self.assertEqual(self.client.put("/api/site-media/gallery_2/", {"file": bad}, format="multipart").status_code, 400)
        fake = SimpleUploadedFile("fake.png", b"not an image", content_type="image/png")
        self.assertEqual(self.client.put("/api/site-media/gallery_2/", {"file": fake}, format="multipart").status_code, 400)
        img_as_video = png("pic.png")
        self.assertEqual(self.client.put("/api/site-media/hero_video/", {"file": img_as_video}, format="multipart").status_code, 400)
        r = self.client.delete("/api/site-media/gallery_1/")
        self.assertIsNone(r.data["url"])

    def test_settings_roundtrip(self):
        self.login()
        r = self.client.put("/api/settings/", {"store_name": "MASSUP", "gstin": "22AAAAA0000A1Z5", "gst_percent": "5"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.client.put("/api/settings/", {"gst_percent": "500"}, format="json").status_code, 400)
