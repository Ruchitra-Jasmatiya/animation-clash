"""Business rules for customers, orders, payments and rewards (kept out of the views so they are easy to test)."""
import hashlib
import hmac
import secrets
from datetime import timedelta
from decimal import Decimal
from urllib.parse import quote

import segno
from django.conf import settings as dj
from django.db import transaction
from django.db.models import F, Value
from django.db.models.functions import Greatest
from django.utils import timezone
from rest_framework import serializers

from products.models import Product

from . import emails
from .audit import client_ip
from .auth import hash_key
from .models import (CartItem, Coupon, Customer, CustomerLogin, CustomerToken, Festival, Order, OrderItem, OtpCode,
                     Reward, RewardPool, StoreSettings, q2)
from .pricing import price_order

# ------------------------------------------------------------------ OTP
OTP_RESEND_SECONDS = 30
OTP_MAX_PER_HOUR = 5
OTP_MAX_ATTEMPTS = 5


def _otp_hash(email, code):
    return hmac.new(dj.SECRET_KEY.encode(), f"{email}:{code}".encode(), hashlib.sha256).hexdigest()


def issue_otp(request, email, purpose, name="", phone=""):
    """Create + e-mail a 6-digit code. Raises ValidationError when asked too often."""
    now = timezone.now()
    recent = OtpCode.objects.filter(email=email, created_at__gt=now - timedelta(hours=1))
    last = recent.first()
    if last and (now - last.created_at).total_seconds() < OTP_RESEND_SECONDS:
        wait = OTP_RESEND_SECONDS - int((now - last.created_at).total_seconds())
        raise serializers.ValidationError({"detail": f"Please wait {wait} seconds before asking for another code."})
    if recent.count() >= OTP_MAX_PER_HOUR:
        raise serializers.ValidationError({"detail": "Too many codes requested. Please try again in an hour."})
    ip = client_ip(request)
    if ip and OtpCode.objects.filter(ip=ip, created_at__gt=now - timedelta(hours=1)).count() >= 20:
        raise serializers.ValidationError({"detail": "Too many requests from this network. Please try again later."})
    OtpCode.objects.filter(email=email, used=False).update(used=True)  # only the newest code works
    code = f"{secrets.randbelow(1_000_000):06d}"
    OtpCode.objects.create(email=email, purpose=purpose, code_hash=_otp_hash(email, code), name=name, phone=phone, ip=ip,
                           expires_at=now + timedelta(minutes=dj.OTP_TTL_MINUTES))
    emails.send_otp(email, code, StoreSettings.load().store_name, purpose)


def check_otp(email, code):
    """Return the matching OtpCode (and mark it used) or raise ValidationError."""
    now = timezone.now()
    row = OtpCode.objects.filter(email=email, used=False, expires_at__gt=now).first()
    if row is None:
        raise serializers.ValidationError({"detail": "That code has expired. Please ask for a new one."})
    if row.attempts >= OTP_MAX_ATTEMPTS:
        row.used = True
        row.save(update_fields=["used"])
        raise serializers.ValidationError({"detail": "Too many wrong tries. Please ask for a new code."})
    if not hmac.compare_digest(row.code_hash, _otp_hash(email, str(code).strip())):
        row.attempts += 1
        row.save(update_fields=["attempts"])
        left = OTP_MAX_ATTEMPTS - row.attempts
        raise serializers.ValidationError({"detail": f"Wrong code. {left} {'try' if left == 1 else 'tries'} left."})
    row.used = True
    row.save(update_fields=["used"])
    return row


def start_session(request, customer):
    """Record the login and hand back a new long-lived token."""
    now = timezone.now()
    raw = "mu_" + secrets.token_urlsafe(40)
    ua = request.META.get("HTTP_USER_AGENT", "")[:300]
    ip = client_ip(request)
    CustomerToken.objects.create(key_hash=hash_key(raw), customer=customer, user_agent=ua, ip=ip,
                                 expires_at=now + timedelta(days=dj.CUSTOMER_TOKEN_DAYS))
    Customer.objects.filter(pk=customer.pk).update(last_login_at=now, login_count=F("login_count") + 1, last_ip=ip)
    CustomerLogin.objects.create(customer=customer, ip=ip, user_agent=ua)
    CustomerToken.objects.filter(customer=customer, expires_at__lt=now).delete()
    return raw


# ------------------------------------------------------------------ stock
def hold_stock(order):
    """Take the order's units out of stock (once)."""
    if order.stock_held:
        return
    for it in order.items.select_related("product"):
        if it.product_id:
            Product.objects.filter(pk=it.product_id).update(stock=Greatest(F("stock") - it.quantity, Value(0)))
    Order.objects.filter(pk=order.pk).update(stock_held=True)
    order.stock_held = True


def release_stock(order):
    if not order.stock_held:
        return
    for it in order.items.all():
        if it.product_id:
            Product.objects.filter(pk=it.product_id).update(stock=F("stock") + it.quantity)
    Order.objects.filter(pk=order.pk).update(stock_held=False)
    order.stock_held = False


# ------------------------------------------------------------------ loyalty + festivals
def loyalty_status(customer, st=None):
    st = st or StoreSettings.load()
    done = Order.objects.filter(customer=customer, payment_status=Order.PAID_P).exclude(status=Order.CANCELLED).count()
    every = max(1, st.loyalty_every)
    cycle = every + 1
    in_cycle = done % cycle
    next_free = st.loyalty_enabled and in_cycle == every
    return {
        "enabled": st.loyalty_enabled, "every": every, "cap": str(st.loyalty_cap), "completed": done,
        "progress": min(in_cycle, every), "to_go": 0 if next_free else every - in_cycle, "next_is_free": next_free,
        "free_orders_won": done // cycle,
    }


def live_festival(subtotal=None, today=None):
    """Best offer that is on today (highest saving for this subtotal when given)."""
    today = today or timezone.localdate()
    offers = [f for f in Festival.objects.filter(active=True, discount_percent__gt=0, start_date__lte=today, end_date__gte=today)]
    if not offers:
        return None
    if subtotal is None:
        return max(offers, key=lambda f: f.discount_percent)
    return max(offers, key=lambda f: f.discount_for(subtotal))


# ------------------------------------------------------------------ quote + checkout
def cart_lines(customer):
    out, issues = [], []
    for ci in CartItem.objects.filter(customer=customer).select_related("product"):
        p = ci.product
        qty = ci.quantity
        if not p.available:
            issues.append({"product": p.id, "name": p.name, "problem": "Sold out"})
        elif qty > p.stock:
            issues.append({"product": p.id, "name": p.name, "problem": f"Only {p.stock} left"})
        out.append({"product": p, "name": p.name, "unit_price": q2(p.price), "quantity": qty})
    return out, issues


def build_quote(customer, coupon_code="", reward_id=None):
    st = StoreSettings.load()
    lines, issues = cart_lines(customer)
    subtotal = q2(sum((l["unit_price"] * l["quantity"] for l in lines), Decimal("0")))
    loyalty = loyalty_status(customer, st)
    free = bool(lines) and loyalty["next_is_free"]

    festival = None if free else live_festival(subtotal)
    coupon = reward = None
    code_err = reward_err = ""
    if not free:
        code = (coupon_code or "").strip()
        if code:
            coupon = Coupon.objects.filter(code__iexact=code).first()
            if coupon is None:
                code_err = "That coupon code doesn't exist."
        if reward_id and coupon is None:
            reward = Reward.objects.filter(pk=reward_id, customer=customer).first()
            if reward is None or reward.status != "available":
                reward, reward_err = None, "That reward can't be used. Scratch the card first."
    priced = price_order(lines, settings=st, coupon=coupon, reward=reward, festival=festival, loyalty=free)
    if code_err:
        priced["coupon_error"] = priced["coupon_error"] or code_err
    if reward_err:
        priced["reward_error"] = reward_err
    return {"lines": lines, "issues": issues, "priced": priced, "st": st, "festival": festival, "coupon": coupon,
            "reward": reward, "loyalty": loyalty, "free": free}


def quote_payload(q):
    pr = q["priced"]
    fest = q["festival"]
    out = {k: str(v) if not isinstance(v, (bool, str)) else v for k, v in pr.items()}
    out.update({
        "items": [{"product": l["product"].id, "name": l["name"], "unit_price": str(l["unit_price"]), "quantity": l["quantity"],
                   "line_total": str(q2(l["unit_price"] * l["quantity"]))} for l in q["lines"]],
        "issues": q["issues"],
        "festival": {"name": fest.name, "percent": str(fest.discount_percent)} if fest and pr["festival_discount"] > 0 else None,
        "coupon_code": q["coupon"].code if q["coupon"] and not pr["coupon_error"] else "",
        "reward": {"id": q["reward"].id, "label": q["reward"].label} if q["reward"] and not pr["reward_error"] else None,
        "loyalty": q["loyalty"], "free_order": q["free"],
        "upi_ready": bool(q["st"].upi_id),
    })
    return out


def upi_uri(order, st):
    name = quote(st.upi_name or st.store_name)
    return f"upi://pay?pa={quote(st.upi_id)}&pn={name}&am={order.total}&cu=INR&tn={quote('Order ' + order.invoice_no)}&tr={quote(order.invoice_no)}"


def payment_payload(order, st=None):
    """What the customer needs to pay: a fresh QR for this order and amount."""
    st = st or StoreSettings.load()
    if order.payment_status == Order.PAID_P or order.total <= 0 or not st.upi_id:
        return None
    uri = upi_uri(order, st)
    svg = segno.make(uri, error="m").svg_inline(scale=7, border=2, dark="#1d2716", light="#ffffff")
    return {"upi_id": st.upi_id, "payee": st.upi_name or st.store_name, "amount": str(order.total), "reference": order.invoice_no,
            "upi_uri": uri, "qr_svg": svg, "expires_at": order.payment_expires_at}


@transaction.atomic
def create_online_order(customer, quote, data):
    """Turn the cart into an order. Everything (prices, stock, discounts) is re-checked here, on the server."""
    st = quote["st"]
    lines = quote["lines"]
    if not lines:
        raise serializers.ValidationError({"detail": "Your cart is empty."})
    if quote["issues"]:
        raise serializers.ValidationError({"detail": "Some items in your cart are no longer available. Please review your cart.", "issues": quote["issues"]})
    pr = quote["priced"]
    if pr["coupon_error"] or pr["reward_error"]:
        raise serializers.ValidationError({"detail": pr["coupon_error"] or pr["reward_error"]})
    if pr["total"] > 0 and not st.upi_id:
        raise serializers.ValidationError({"detail": "Online payment isn't set up yet. Please try again soon."})

    # lock the products so two shoppers can't buy the last unit at once
    ids = [l["product"].id for l in lines]
    fresh = {p.id: p for p in Product.objects.select_for_update().filter(pk__in=ids)}
    for l in lines:
        p = fresh.get(l["product"].id)
        if p is None or not p.available or l["quantity"] > p.stock:
            raise serializers.ValidationError({"detail": f"Sorry, {l['name']} just ran out of stock."})

    now = timezone.now()
    free_total = pr["total"] <= 0
    order = Order.objects.create(
        source="online", customer=customer, customer_name=data["name"], phone=data["phone"], email=customer.email,
        address=data["address"], notes=data.get("notes", ""), payment_method="loyalty" if quote["free"] and free_total else "upi",
        status=Order.PAID if free_total else Order.PENDING, payment_status=Order.PAID_P if free_total else Order.UNPAID,
        paid_at=now if free_total else None, verified_by="system" if free_total else "",
        payment_expires_at=None if free_total else now + timedelta(minutes=st.payment_window_minutes),
        coupon=quote["coupon"], coupon_code=quote["coupon"].code if quote["coupon"] else "",
        festival_name=quote["festival"].name if quote["festival"] and pr["festival_discount"] > 0 else "",
        festival_discount=pr["festival_discount"], reward=quote["reward"],
        reward_label=quote["reward"].label if quote["reward"] else "", reward_discount=pr["reward_discount"],
        loyalty_free=quote["free"], loyalty_discount=pr["loyalty_discount"],
        subtotal=pr["subtotal"], discount=pr["discount"], shipping=pr["shipping"], tax=pr["tax"], total=pr["total"],
        gst_percent=pr["gst_percent"], prices_include_gst=pr["prices_include_gst"],
    )
    OrderItem.objects.bulk_create([OrderItem(order=order, product=l["product"], name=l["name"], unit_price=l["unit_price"],
                                             quantity=l["quantity"], line_total=q2(l["unit_price"] * l["quantity"])) for l in lines])
    hold_stock(order)
    if quote["coupon"]:
        Coupon.objects.filter(pk=quote["coupon"].pk).update(used_count=F("used_count") + 1)
    if quote["reward"]:
        Reward.objects.filter(pk=quote["reward"].pk).update(used_at=now)
    CartItem.objects.filter(customer=customer).delete()
    Customer.objects.filter(pk=customer.pk).update(name=data["name"], phone=data["phone"], address=data["address"])
    return order


# ------------------------------------------------------------------ payments
def expire_stale_orders():
    """Orders nobody paid for in time are cancelled and their stock goes back on the shelf."""
    now = timezone.now()
    stale = Order.objects.filter(source="online", payment_status__in=[Order.UNPAID, Order.REJECTED],
                                 status=Order.PENDING, payment_expires_at__lt=now)
    for o in stale:
        cancel_order(o, note="Payment window expired")


@transaction.atomic
def cancel_order(order, note=""):
    if order.status == Order.CANCELLED:
        return order
    order.status = Order.CANCELLED
    if note:
        order.notes = (order.notes + "\n" + note).strip()
    order.save(update_fields=["status", "notes"])
    release_stock(order)
    if order.coupon_id:
        Coupon.objects.filter(pk=order.coupon_id, used_count__gt=0).update(used_count=F("used_count") - 1)
    if order.reward_id:
        Reward.objects.filter(pk=order.reward_id).update(used_at=None)
    return order


def draw_reward(customer, order):
    pool = list(RewardPool.objects.filter(active=True))
    if not pool:
        return None
    pick = secrets.SystemRandom().choices(pool, weights=[p.weight for p in pool], k=1)[0]
    return Reward.objects.create(
        customer=customer, source_order=order, label=pick.display_label(), kind=pick.kind, value=pick.value,
        max_discount=pick.max_discount, min_order=pick.min_order,
        valid_until=timezone.now() + timedelta(days=pick.valid_days))


@transaction.atomic
def confirm_payment(order, by="system"):
    """Payment is real: mark paid, give a scratch card, tell the customer."""
    if order.payment_status == Order.PAID_P:
        return order
    if order.status == Order.CANCELLED:
        raise serializers.ValidationError({"detail": "This order was cancelled. Restore it first."})
    order.payment_status = Order.PAID_P
    if order.status == Order.PENDING:
        order.status = Order.PAID
    order.paid_at = timezone.now()
    order.verified_by = by
    order.save(update_fields=["payment_status", "status", "paid_at", "verified_by"])
    if order.customer_id and order.total > 0 and not order.rewards_earned.exists():
        draw_reward(order.customer, order)
    emails.send_order_paid(order, StoreSettings.load().store_name)
    return order
