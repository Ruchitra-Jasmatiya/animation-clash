import re
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from products.models import Product

from .models import (CartItem, Coupon, Customer, Festival, Order, OtpCode, Reward, RewardPool, StoreSettings, Visit)
from . import services


def otp_from_mail():
    return re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)


class ShopBase(TestCase):
    def setUp(self):
        cache.clear()
        st = StoreSettings.load()
        st.upi_id = "massup@okaxis"; st.upi_name = "MASSUP"; st.gst_percent = Decimal("18"); st.prices_include_gst = True
        st.shipping_fee = Decimal("50"); st.free_shipping_above = Decimal("1000"); st.save()
        self.jar = Product.objects.create(name="Jar", price=Decimal("1000"), stock=5, image_url="/images/a.jpg")
        self.small = Product.objects.create(name="Sachet", price=Decimal("100"), stock=3, image_url="/images/b.jpg")
        self.api = APIClient()

    def signup(self, email="asha@example.com", name="Asha Rao", phone="9876543210", client=None):
        c = client or self.api
        r = c.post("/api/customer/signup/", {"email": email, "name": name, "phone": phone}, format="json")
        assert r.status_code == 200, r.data
        r = c.post("/api/customer/verify/", {"email": email, "code": otp_from_mail()}, format="json")
        assert r.status_code == 200, r.data
        c.credentials(HTTP_AUTHORIZATION="Customer " + r.data["token"])
        return r.data

    def staff(self):
        u = get_user_model().objects.create_user("boss", password="Strong-Pass-9921", is_staff=True)
        c = APIClient()
        r = c.post("/api/auth/login/", {"username": "boss", "password": "Strong-Pass-9921"}, format="json")
        c.credentials(HTTP_AUTHORIZATION="Token " + r.data["token"])
        return c

    def addr(self, **extra):
        d = {"name": "Asha Rao", "phone": "9876543210", "address": "12 MG Road, Pune 411001"}
        d.update(extra)
        return d

    def buy(self, items, **extra):
        for pid, qty in items:
            self.api.post("/api/my/cart/", {"product": pid, "quantity": qty}, format="json")
        return self.api.post("/api/my/checkout/", self.addr(**extra), format="json")


class AuthTests(ShopBase):
    def test_signup_otp_flow_and_year_long_session(self):
        out = self.signup()
        self.assertTrue(out["new"]); self.assertEqual(out["customer"]["email"], "asha@example.com")
        self.assertEqual(Customer.objects.count(), 1)
        self.assertEqual(self.api.get("/api/customer/me/").status_code, 200)
        self.assertEqual(self.api.get("/api/products/").status_code, 200)   # signed-in customers can read the shop
        tok = Customer.objects.get().tokens.get()
        self.assertGreater(tok.expires_at, timezone.now() + timedelta(days=360))

    def test_wall_blocks_anonymous(self):
        self.assertEqual(APIClient().get("/api/products/").status_code, 401)
        self.assertEqual(APIClient().get("/api/my/cart/").status_code, 401)

    def test_wrong_code_and_attempt_limit(self):
        self.api.post("/api/customer/signup/", {"email": "a@b.co", "name": "Al"}, format="json")
        good = otp_from_mail()
        bad = "000000" if good != "000000" else "111111"
        for i in range(5):
            r = self.api.post("/api/customer/verify/", {"email": "a@b.co", "code": bad}, format="json")
            self.assertEqual(r.status_code, 400)
        # after 5 misses even the right code is refused
        r = self.api.post("/api/customer/verify/", {"email": "a@b.co", "code": good}, format="json")
        self.assertEqual(r.status_code, 400); self.assertEqual(Customer.objects.count(), 0)

    def test_code_expires_and_works_once(self):
        self.api.post("/api/customer/signup/", {"email": "a@b.co", "name": "Al"}, format="json")
        code = otp_from_mail()
        OtpCode.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.api.post("/api/customer/verify/", {"email": "a@b.co", "code": code}, format="json").status_code, 400)
        OtpCode.objects.all().delete(); cache.clear()
        self.api.post("/api/customer/signup/", {"email": "a@b.co", "name": "Al"}, format="json")
        code = otp_from_mail()
        self.assertEqual(self.api.post("/api/customer/verify/", {"email": "a@b.co", "code": code}, format="json").status_code, 200)
        self.assertEqual(self.api.post("/api/customer/verify/", {"email": "a@b.co", "code": code}, format="json").status_code, 400)

    def test_resend_cooldown_and_hourly_cap(self):
        self.api.post("/api/customer/signup/", {"email": "a@b.co", "name": "Al"}, format="json")
        r = self.api.post("/api/customer/signup/", {"email": "a@b.co", "name": "Al"}, format="json")
        self.assertEqual(r.status_code, 400)  # too soon
        for _ in range(6):
            OtpCode.objects.filter(email="a@b.co").update(created_at=timezone.now() - timedelta(minutes=5))
            self.api.post("/api/customer/signup/", {"email": "a@b.co", "name": "Al"}, format="json")
        OtpCode.objects.filter(email="a@b.co").update(created_at=timezone.now() - timedelta(minutes=5))
        self.assertEqual(self.api.post("/api/customer/signup/", {"email": "a@b.co", "name": "Al"}, format="json").status_code, 400)

    def test_login_existing_and_missing_and_duplicate_signup(self):
        self.signup()
        c2 = APIClient()
        self.assertEqual(c2.post("/api/customer/login/", {"email": "nobody@x.com"}, format="json").status_code, 404)
        self.assertEqual(c2.post("/api/customer/signup/", {"email": "asha@example.com", "name": "Again"}, format="json").status_code, 409)
        OtpCode.objects.update(created_at=timezone.now() - timedelta(minutes=5))
        self.assertEqual(c2.post("/api/customer/login/", {"email": "asha@example.com"}, format="json").status_code, 200)
        r = c2.post("/api/customer/verify/", {"email": "asha@example.com", "code": otp_from_mail()}, format="json")
        self.assertEqual(r.status_code, 200); self.assertFalse(r.data["new"])
        self.assertEqual(Customer.objects.get().login_count, 2)

    def test_two_emails_two_accounts_and_validation(self):
        self.signup(); self.signup("ben@example.com", "Ben Lee", client=APIClient())
        self.assertEqual(Customer.objects.count(), 2)
        self.assertEqual(self.api.post("/api/customer/signup/", {"email": "not-an-email", "name": "X"}, format="json").status_code, 400)
        self.assertEqual(APIClient().post("/api/customer/signup/", {"email": "c@d.com", "name": "Cy", "phone": "123"}, format="json").status_code, 400)

    def test_logout_kills_token_and_blocked_customer_is_out(self):
        self.signup()
        self.api.post("/api/customer/logout/")
        self.assertEqual(self.api.get("/api/customer/me/").status_code, 401)
        c = APIClient()
        self.signup("z@z.com", "Zed", client=c)
        staff = self.staff()
        cid = Customer.objects.get(email="z@z.com").id
        self.assertEqual(staff.patch(f"/api/customers/{cid}/", {"is_blocked": True}, format="json").status_code, 200)
        self.assertEqual(c.get("/api/customer/me/").status_code, 401)

    def test_roles_do_not_cross(self):
        self.signup()
        self.assertEqual(self.api.get("/api/customers/").status_code, 401)       # customer token can't use staff API
        self.assertEqual(self.api.post("/api/products/", {"name": "x", "price": 1}, format="json").status_code, 403)
        staff = self.staff()
        self.assertEqual(staff.get("/api/my/cart/").status_code, 401)             # staff token isn't a customer


class CartWishlistTests(ShopBase):
    def test_cart_stock_limits_and_wishlist(self):
        self.signup()
        r = self.api.post("/api/my/cart/", {"product": self.jar.id, "quantity": 2}, format="json")
        self.assertEqual(r.data["count"], 2)
        self.assertEqual(self.api.post("/api/my/cart/", {"product": self.jar.id, "quantity": 99}, format="json").status_code, 400)
        r = self.api.post("/api/my/cart/", {"product": self.jar.id, "quantity": 1, "add": True}, format="json")
        self.assertEqual(r.data["count"], 3)
        self.assertEqual(self.api.post("/api/my/cart/", {"product": self.jar.id, "quantity": 0}, format="json").data["count"], 0)
        r = self.api.post("/api/my/wishlist/", {"product": self.small.id}, format="json")
        self.assertEqual(r.data["wishlist"]["ids"], [self.small.id])
        r = self.api.post("/api/my/wishlist/", {"product": self.small.id, "move_to_cart": True}, format="json")
        self.assertEqual(r.data["cart"]["count"], 1); self.assertEqual(r.data["wishlist"]["ids"], [])
        self.jar.in_stock = False; self.jar.save()
        self.assertEqual(self.api.post("/api/my/cart/", {"product": self.jar.id, "quantity": 1}, format="json").status_code, 400)
        s = self.api.get("/api/my/summary/").data
        self.assertEqual((s["cart"], s["wishlist"], s["orders"]), (1, 0, 0))

    def test_carts_are_per_customer(self):
        self.signup()
        self.api.post("/api/my/cart/", {"product": self.jar.id, "quantity": 1}, format="json")
        other = APIClient(); self.signup("o@o.com", "Other", client=other)
        self.assertEqual(other.get("/api/my/cart/").data["count"], 0)


class CheckoutTests(ShopBase):
    def test_checkout_prices_from_server_reserves_stock_and_makes_a_fresh_qr(self):
        self.signup()
        r = self.buy([(self.jar.id, 1), (self.small.id, 2)])
        self.assertEqual(r.status_code, 201, r.data)
        o = r.data
        self.assertEqual(o["subtotal"], "1200.00"); self.assertEqual(o["shipping"], "0.00")   # free above 1000
        self.assertEqual(o["total"], "1200.00"); self.assertEqual(o["payment_status"], "unpaid")
        self.assertIn("upi://pay?pa=massup%40okaxis", o["payment"]["upi_uri"]); self.assertIn("am=1200.00", o["payment"]["upi_uri"])
        self.assertIn("<svg", o["payment"]["qr_svg"])
        self.jar.refresh_from_db(); self.small.refresh_from_db()
        self.assertEqual((self.jar.stock, self.small.stock), (4, 1))
        self.assertEqual(CartItem.objects.count(), 0)
        # a second order gets a different reference + QR
        r2 = self.buy([(self.small.id, 1)])
        self.assertNotEqual(r2.data["payment"]["reference"], o["payment"]["reference"])
        self.assertNotEqual(r2.data["payment"]["qr_svg"], o["payment"]["qr_svg"])
        self.assertEqual(r2.data["shipping"], "50.00")

    def test_cannot_oversell_and_empty_cart_and_bad_address(self):
        self.signup()
        self.assertEqual(self.api.post("/api/my/checkout/", self.addr(), format="json").status_code, 400)
        self.api.post("/api/my/cart/", {"product": self.small.id, "quantity": 3}, format="json")
        Product.objects.filter(pk=self.small.id).update(stock=2)
        self.assertEqual(self.api.post("/api/my/checkout/", self.addr(), format="json").status_code, 400)
        Product.objects.filter(pk=self.small.id).update(stock=3)
        self.assertEqual(self.api.post("/api/my/checkout/", self.addr(address="short"), format="json").status_code, 400)
        self.assertEqual(self.api.post("/api/my/checkout/", self.addr(phone="12345"), format="json").status_code, 400)

    def test_payment_submit_then_staff_confirm_gives_scratch_card(self):
        self.signup()
        oid = self.buy([(self.jar.id, 1)]).data["id"]
        r = self.api.post(f"/api/my/orders/{oid}/submit-payment/", {"upi_ref": "short"}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.api.post(f"/api/my/orders/{oid}/submit-payment/", {"upi_ref": "425512345678"}, format="json")
        self.assertEqual(r.data["payment_status"], "submitted")
        staff = self.staff()
        listing = staff.get("/api/orders/?payment=submitted").data
        self.assertEqual(len(listing), 1); self.assertEqual(listing[0]["upi_ref"], "425512345678")
        self.assertEqual(staff.get("/api/dashboard/").data["to_verify"], 1)
        self.assertEqual(Reward.objects.count(), 0)
        RewardPool.objects.all().delete(); RewardPool.objects.create(kind="flat", value=10, weight=1)
        r = staff.post(f"/api/orders/{oid}/confirm-payment/")
        self.assertEqual(r.data["payment_status"], "paid"); self.assertEqual(r.data["status"], "paid")
        self.assertEqual(Reward.objects.count(), 1)
        self.assertEqual(staff.post(f"/api/orders/{oid}/confirm-payment/").status_code, 200)   # idempotent
        self.assertEqual(Reward.objects.count(), 1)
        self.assertEqual(staff.get("/api/dashboard/").data["revenue"], "1000.00")
        # same UTR can't be used on another order
        oid2 = self.buy([(self.small.id, 1)]).data["id"]
        self.assertEqual(self.api.post(f"/api/my/orders/{oid2}/submit-payment/", {"upi_ref": "425512345678"}, format="json").status_code, 400)

    def test_scratch_card_hidden_until_scratched_then_usable_once(self):
        self.signup()
        RewardPool.objects.all().delete(); RewardPool.objects.create(kind="flat", value=10, weight=1, min_order=0)
        oid = self.buy([(self.small.id, 1)]).data["id"]
        self.api.post(f"/api/my/orders/{oid}/submit-payment/", {"upi_ref": "AB1234567890"}, format="json")
        self.staff().post(f"/api/orders/{oid}/confirm-payment/")
        card = self.api.get("/api/my/rewards/").data["cards"][0]
        self.assertEqual(card["status"], "unscratched"); self.assertIsNone(card["label"])           # prize hidden
        # cannot use before scratching
        self.api.post("/api/my/cart/", {"product": self.small.id, "quantity": 2}, format="json")
        q = self.api.post("/api/my/quote/", {"reward_id": card["id"]}, format="json").data
        self.assertTrue(q["reward_error"]); self.assertEqual(q["reward_discount"], "0.00")
        r = self.api.post(f"/api/my/rewards/{card['id']}/scratch/").data
        self.assertEqual(r["label"], "Rs 10 off"); self.assertEqual(r["status"], "available")
        q = self.api.post("/api/my/quote/", {"reward_id": card["id"]}, format="json").data
        self.assertEqual(q["reward_discount"], "10.00")
        o = self.api.post("/api/my/checkout/", self.addr() | {"reward_id": card["id"]}, format="json").data
        self.assertEqual(o["reward_discount"], "10.00"); self.assertEqual(o["subtotal"], "200.00")
        self.assertEqual(Reward.objects.get(pk=card["id"]).status, "used")
        # cancelling gives the reward back
        self.api.post(f"/api/my/orders/{o['id']}/cancel/")
        self.assertEqual(Reward.objects.get(pk=card["id"]).status, "available")

    def test_cancel_and_expiry_restore_stock(self):
        self.signup()
        oid = self.buy([(self.jar.id, 2)]).data["id"]
        self.jar.refresh_from_db(); self.assertEqual(self.jar.stock, 3)
        self.assertEqual(self.api.post(f"/api/my/orders/{oid}/cancel/").status_code, 200)
        self.jar.refresh_from_db(); self.assertEqual(self.jar.stock, 5)
        oid = self.buy([(self.jar.id, 1)]).data["id"]
        Order.objects.filter(pk=oid).update(payment_expires_at=timezone.now() - timedelta(minutes=1))
        self.assertEqual(self.api.get(f"/api/my/orders/{oid}/").data["status"], "cancelled")
        self.jar.refresh_from_db(); self.assertEqual(self.jar.stock, 5)

    def test_coupon_and_festival_discounts_computed_on_server(self):
        self.signup()
        Coupon.objects.create(code="TEN", discount_type="percent", value=10)
        today = timezone.localdate()
        Festival.objects.create(name="Diwali", date=today, start_date=today - timedelta(days=1), end_date=today + timedelta(days=1),
                                discount_percent=Decimal("5"), active=True)
        self.api.post("/api/my/cart/", {"product": self.jar.id, "quantity": 1}, format="json")
        q = self.api.post("/api/my/quote/", {"coupon_code": "ten"}, format="json").data
        self.assertEqual(q["festival_discount"], "50.00")                 # 5% of 1000
        self.assertEqual(q["discount"], "95.00")                          # 10% of the remaining 950
        self.assertEqual(q["total"], "905.00"); self.assertEqual(q["festival"]["name"], "Diwali")
        # festival switched off -> gone
        Festival.objects.update(active=False)
        self.assertEqual(self.api.post("/api/my/quote/", {}, format="json").data["festival_discount"], "0.00")
        self.assertTrue(self.api.post("/api/my/quote/", {"coupon_code": "NOPE"}, format="json").data["coupon_error"])

    def test_auto_confirm_setting(self):
        StoreSettings.objects.update(auto_confirm_payments=True)
        self.signup()
        oid = self.buy([(self.small.id, 1)]).data["id"]
        r = self.api.post(f"/api/my/orders/{oid}/submit-payment/", {"upi_ref": "ZZ99887766"}, format="json")
        self.assertEqual(r.data["payment_status"], "paid")

    def test_staff_cancel_restores_stock_and_online_order_cannot_be_uncancelled(self):
        self.signup()
        oid = self.buy([(self.jar.id, 1)]).data["id"]
        staff = self.staff()
        self.assertEqual(staff.patch(f"/api/orders/{oid}/", {"status": "cancelled"}, format="json").status_code, 200)
        self.jar.refresh_from_db(); self.assertEqual(self.jar.stock, 5)
        self.assertEqual(staff.patch(f"/api/orders/{oid}/", {"status": "paid"}, format="json").status_code, 400)

    def test_staff_invoice_also_moves_stock(self):
        staff = self.staff()
        r = staff.post("/api/orders/", {"customer_name": "Walk-in", "payment_method": "cash", "status": "paid",
                                        "lines": [{"product": self.jar.id, "quantity": 2}]}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.jar.refresh_from_db(); self.assertEqual(self.jar.stock, 3)
        self.assertEqual(r.data["payment_status"], "paid")


class LoyaltyTests(ShopBase):
    def paid_order(self, product, qty=1):
        oid = self.buy([(product.id, qty)]).data["id"]
        self.api.post(f"/api/my/orders/{oid}/submit-payment/", {"upi_ref": f"UTR{oid:09d}"}, format="json")
        self.staff_client.post(f"/api/orders/{oid}/confirm-payment/")
        return oid

    def test_eleventh_order_is_free_up_to_5000_then_cycle_restarts(self):
        self.signup()
        self.staff_client = self.staff()
        Product.objects.update(stock=999)
        st = StoreSettings.load(); st.shipping_fee = Decimal("0"); st.save()
        for i in range(10):
            self.assertFalse(self.api.get("/api/my/rewards/").data["loyalty"]["next_is_free"], i)
            self.paid_order(self.small)
        loy = self.api.get("/api/my/rewards/").data["loyalty"]
        self.assertTrue(loy["next_is_free"]); self.assertEqual(loy["completed"], 10)
        # 11th: 3 jars = 3000 -> completely free, no payment needed
        r = self.buy([(self.jar.id, 3)])
        self.assertEqual(r.data["total"], "0.00"); self.assertEqual(r.data["payment_status"], "paid"); self.assertTrue(r.data["loyalty_free"])
        self.assertEqual(r.data["loyalty_discount"], "3000.00"); self.assertIsNone(r.data["payment"])
        loy = self.api.get("/api/my/rewards/").data["loyalty"]
        self.assertFalse(loy["next_is_free"]); self.assertEqual(loy["free_orders_won"], 1)
        # after the free order the counter starts again
        self.assertEqual(loy["progress"], 0)
        for _ in range(10):
            self.paid_order(self.small)
        # next free order bigger than the 5000 cap: only 5000 is free, the rest is paid
        Product.objects.filter(pk=self.jar.pk).update(price=Decimal("2000"))
        r = self.buy([(self.jar.id, 4)])      # 8000
        self.assertEqual(r.data["loyalty_discount"], "5000.00"); self.assertEqual(r.data["total"], "3000.00")
        self.assertEqual(r.data["payment_status"], "unpaid")

    def test_free_order_ignores_coupons_and_keeps_them(self):
        self.signup()
        self.staff_client = self.staff()
        Product.objects.update(stock=999)
        Coupon.objects.create(code="TEN", discount_type="percent", value=10)
        for _ in range(10):
            self.paid_order(self.small)
        self.api.post("/api/my/cart/", {"product": self.small.id, "quantity": 1}, format="json")
        q = self.api.post("/api/my/quote/", {"coupon_code": "TEN"}, format="json").data
        self.assertTrue(q["free_order"]); self.assertEqual(q["discount"], "0.00")
        self.assertEqual(Coupon.objects.get(code="TEN").used_count, 0)


class AnalyticsAndAdminTests(ShopBase):
    def test_tracking_and_analytics(self):
        anon = APIClient()
        for vid, path in (("visitor-aaaa1111", "/"), ("visitor-aaaa1111", "/products"), ("visitor-bbbb2222", "/login")):
            self.assertEqual(anon.post("/api/track/", {"visitor_id": vid, "path": path}, format="json").status_code, 204)
        anon.post("/api/track/", {"visitor_id": "visitor-cccc3333", "path": "/manage/orders"}, format="json")   # staff pages ignored
        anon.post("/api/track/", {"visitor_id": "x", "path": "/"}, format="json")                                 # bad id ignored
        self.assertEqual(Visit.objects.count(), 3)
        self.signup()
        a = self.staff().get("/api/analytics/").data
        self.assertEqual(a["visitors_total"], 2); self.assertEqual(a["page_views_total"], 3)
        self.assertEqual(a["customers_total"], 1); self.assertEqual(a["emails_logged_in"], 1); self.assertEqual(a["logins_total"], 1)
        self.assertEqual(len(a["series"]), 14); self.assertEqual(a["recent_logins"][0]["email"], "asha@example.com")

    def test_customers_list_search_and_detail(self):
        self.signup()
        oid = self.buy([(self.small.id, 1)]).data["id"]
        staff = self.staff()
        rows = staff.get("/api/customers/?q=asha").data
        self.assertEqual(len(rows), 1); self.assertEqual(rows[0]["orders"], 1)
        d = staff.get(f"/api/customers/{rows[0]['id']}/").data
        self.assertEqual(len(d["recent_orders"]), 1); self.assertEqual(len(d["logins"]), 1)
        self.assertEqual(staff.get("/api/customers/?q=zzz").data, [])

    def test_festival_crud_validation_and_public_offers(self):
        staff = self.staff()
        today = timezone.localdate()
        bad = {"name": "X", "date": str(today), "start_date": str(today), "end_date": str(today - timedelta(days=1))}
        self.assertEqual(staff.post("/api/festivals/", bad, format="json").status_code, 400)
        ok = {"name": "Diwali", "date": str(today), "start_date": str(today), "end_date": str(today + timedelta(days=2)),
              "discount_percent": "12", "active": True, "tagline": "Happy Diwali"}
        r = staff.post("/api/festivals/", ok, format="json")
        self.assertEqual(r.status_code, 201); self.assertEqual(r.data["state"], "live")
        offers = APIClient().get("/api/offers/").data
        self.assertEqual(offers["live"]["name"], "Diwali"); self.assertEqual(offers["live"]["percent"], "12.00")
        self.assertEqual(APIClient().post("/api/festivals/", ok, format="json").status_code, 401)

    def test_reward_pool_admin(self):
        staff = self.staff()
        self.assertEqual(staff.post("/api/reward-pool/", {"kind": "percent", "value": "95", "weight": 5}, format="json").status_code, 400)
        r = staff.post("/api/reward-pool/", {"kind": "percent", "value": "7", "max_discount": "120", "weight": 5}, format="json")
        self.assertEqual(r.status_code, 201); self.assertEqual(r.data["shown_as"], "7% off")

    def test_settings_validate_upi(self):
        staff = self.staff()
        self.assertEqual(staff.put("/api/settings/", {"upi_id": "not a upi"}, format="json").status_code, 400)
        self.assertEqual(staff.put("/api/settings/", {"upi_id": "shop@okicici", "loyalty_every": 8}, format="json").status_code, 200)

    def test_seed_offers_command(self):
        from django.core.management import call_command
        call_command("seed_offers")
        self.assertTrue(Festival.objects.filter(name="Diwali").exists())
        n = Festival.objects.count()
        call_command("seed_offers")
        self.assertEqual(Festival.objects.count(), n)
