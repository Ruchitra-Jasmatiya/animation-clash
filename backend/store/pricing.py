"""Server-side billing maths. The browser never decides a total."""
from decimal import Decimal

from rest_framework import serializers

from .models import Coupon, StoreSettings, q2


def price_lines(lines, coupon_code="", settings=None, check_coupon=True):
    """lines: [{'unit_price': Decimal, 'quantity': int}, ...] -> dict of money fields (+ coupon)."""
    settings = settings or StoreSettings.load()
    subtotal = q2(sum((Decimal(l["unit_price"]) * l["quantity"] for l in lines), Decimal("0")))

    coupon, discount = None, Decimal("0")
    code = (coupon_code or "").strip()
    if code:
        coupon = Coupon.objects.filter(code__iexact=code).first()
        if coupon is None:
            raise serializers.ValidationError({"coupon_code": "That coupon code doesn't exist."})
        if check_coupon:
            ok, message, discount = coupon.evaluate(subtotal)
            if not ok:
                raise serializers.ValidationError({"coupon_code": message})

    taxable = subtotal - discount
    shipping = Decimal(settings.shipping_fee)
    if settings.free_shipping_above > 0 and taxable >= settings.free_shipping_above:
        shipping = Decimal("0")
    if not lines:
        shipping = Decimal("0")

    g = Decimal(settings.gst_percent)
    if settings.prices_include_gst:
        tax = taxable * g / (Decimal(100) + g)
        total = taxable + shipping
    else:
        tax = taxable * g / Decimal(100)
        total = taxable + tax + shipping

    return {
        "subtotal": subtotal, "discount": q2(discount), "shipping": q2(shipping),
        "tax": q2(tax), "total": q2(total), "coupon": coupon,
        "gst_percent": g, "prices_include_gst": settings.prices_include_gst,
    }
