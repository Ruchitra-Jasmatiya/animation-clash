"""Server-side billing maths. The browser never decides a total."""
from decimal import Decimal

from rest_framework import serializers

from .models import Coupon, StoreSettings, q2

ZERO = Decimal("0")


def price_order(lines, *, settings=None, coupon=None, check_coupon=True, reward=None, festival=None, loyalty=False):
    """The one place where a total is worked out.

    lines     [{'unit_price': Decimal, 'quantity': int}, ...]
    coupon    a Coupon (or None)
    reward    a revealed, unused Reward (or None)
    festival  the live Festival offer (or None)
    loyalty   True when this is the customer's free order (then no other discount is used)

    Order of steps: subtotal -> festival offer -> coupon OR reward -> shipping -> GST -> free-order reward.
    """
    settings = settings or StoreSettings.load()
    subtotal = q2(sum((Decimal(l["unit_price"]) * l["quantity"] for l in lines), ZERO))

    festival_discount = coupon_discount = reward_discount = ZERO
    free_shipping_reward = False
    coupon_error = reward_error = ""

    if not loyalty:
        if festival is not None:
            festival_discount = festival.discount_for(subtotal)
        after_festival = subtotal - festival_discount

        if coupon is not None:
            if check_coupon:
                ok, message, amount = coupon.evaluate(after_festival)
                if ok:
                    coupon_discount = amount
                else:
                    coupon_error = message
            else:
                coupon_discount = ZERO
        elif reward is not None:
            if after_festival < reward.min_order:
                reward_error = f"Spend at least Rs {Decimal(reward.min_order).normalize():f} to use this reward."
            elif reward.kind == "shipping":
                free_shipping_reward = True
            else:
                reward_discount = reward.discount_for(after_festival)

    taxable = subtotal - festival_discount - coupon_discount - reward_discount
    shipping = Decimal(settings.shipping_fee)
    if settings.free_shipping_above > 0 and taxable >= settings.free_shipping_above:
        shipping = ZERO
    if free_shipping_reward or not lines:
        shipping = ZERO

    g = Decimal(settings.gst_percent)
    if settings.prices_include_gst:
        tax = taxable * g / (Decimal(100) + g)
        total = taxable + shipping
    else:
        tax = taxable * g / Decimal(100)
        total = taxable + tax + shipping

    loyalty_discount = ZERO
    if loyalty:
        loyalty_discount = min(Decimal(settings.loyalty_cap), q2(total))
    total = q2(total) - q2(loyalty_discount)

    return {
        "subtotal": subtotal, "festival_discount": q2(festival_discount), "discount": q2(coupon_discount),
        "reward_discount": q2(reward_discount), "loyalty_discount": q2(loyalty_discount),
        "shipping": q2(shipping), "tax": q2(tax), "total": q2(total),
        "gst_percent": g, "prices_include_gst": settings.prices_include_gst,
        "free_shipping_reward": free_shipping_reward, "coupon_error": coupon_error, "reward_error": reward_error,
    }


def price_lines(lines, coupon_code="", settings=None, check_coupon=True):
    """Staff invoices: lines + optional coupon code -> money fields (+ the coupon)."""
    coupon = None
    code = (coupon_code or "").strip()
    if code:
        coupon = Coupon.objects.filter(code__iexact=code).first()
        if coupon is None:
            raise serializers.ValidationError({"coupon_code": "That coupon code doesn't exist."})
    priced = price_order(lines, settings=settings, coupon=coupon, check_coupon=check_coupon)
    if priced["coupon_error"]:
        raise serializers.ValidationError({"coupon_code": priced["coupon_error"]})
    for k in ("festival_discount", "reward_discount", "loyalty_discount", "free_shipping_reward", "coupon_error", "reward_error"):
        priced.pop(k)
    priced["coupon"] = coupon
    return priced
