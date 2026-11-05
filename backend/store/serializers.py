import re

from django.db import transaction
from django.db.models import F
from rest_framework import serializers

from products.models import Product

from .models import Coupon, Order, OrderItem, StoreSettings, q2
from .pricing import price_lines

MAX_PRICE = 10_000_000


class StoreSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreSettings
        exclude = ["id"]


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ["id", "code", "description", "discount_type", "value", "min_order", "max_discount",
                  "usage_limit", "used_count", "starts_at", "expires_at", "active", "created_at"]
        read_only_fields = ["id", "used_count", "created_at"]

    def validate_code(self, value):
        value = value.strip().upper()
        if not re.fullmatch(r"[A-Z0-9_-]{3,40}", value):
            raise serializers.ValidationError("Use 3-40 letters, numbers, - or _ (no spaces).")
        qs = Coupon.objects.filter(code__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A coupon with this code already exists.")
        return value

    def validate(self, attrs):
        dtype = attrs.get("discount_type", getattr(self.instance, "discount_type", Coupon.PERCENT))
        value = attrs.get("value", getattr(self.instance, "value", None))
        if dtype == Coupon.PERCENT and value is not None and value > 100:
            raise serializers.ValidationError({"value": "A percent coupon can't be more than 100."})
        start = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        end = attrs.get("expires_at", getattr(self.instance, "expires_at", None))
        if start and end and end <= start:
            raise serializers.ValidationError({"expires_at": "Expiry must be after the start."})
        return attrs


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "product", "name", "unit_price", "quantity", "line_total"]


class LineInputSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), required=False, allow_null=True)
    name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, min_value=0, max_value=MAX_PRICE)
    quantity = serializers.IntegerField(min_value=1, max_value=999)

    def validate(self, attrs):
        if not attrs.get("product"):
            if not (attrs.get("name") or "").strip():
                raise serializers.ValidationError({"name": "Give the item a name or pick a product."})
            if attrs.get("unit_price") is None:
                raise serializers.ValidationError({"unit_price": "A custom item needs a price."})
        return attrs


def resolve_lines(raw_lines):
    """Turn posted lines into trusted ones: products are priced from the database."""
    out = []
    for l in raw_lines:
        product = l.get("product")
        name = product.name if product else l["name"].strip()
        price = l["unit_price"] if l.get("unit_price") is not None else product.price
        out.append({"product": product, "name": name, "unit_price": q2(price), "quantity": l["quantity"]})
    return out


class PreviewSerializer(serializers.Serializer):
    lines = LineInputSerializer(many=True, allow_empty=True, max_length=100)
    coupon_code = serializers.CharField(max_length=40, required=False, allow_blank=True)

    def totals(self):
        lines = resolve_lines(self.validated_data["lines"])
        priced = price_lines(lines, self.validated_data.get("coupon_code", ""))
        coupon = priced.pop("coupon")
        priced["coupon_code"] = coupon.code if coupon else ""
        return {k: str(v) if not isinstance(v, (bool, str)) else v for k, v in priced.items()}


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    lines = LineInputSerializer(many=True, write_only=True, required=False, max_length=100)
    coupon_code = serializers.CharField(max_length=40, required=False, allow_blank=True)

    class Meta:
        model = Order
        fields = ["id", "invoice_no", "customer_name", "phone", "email", "address", "status", "payment_method",
                  "notes", "coupon_code", "subtotal", "discount", "shipping", "tax", "total", "gst_percent",
                  "prices_include_gst", "items", "lines", "created_at"]
        read_only_fields = ["id", "invoice_no", "subtotal", "discount", "shipping", "tax", "total",
                            "gst_percent", "prices_include_gst", "created_at"]

    def validate_customer_name(self, v):
        v = " ".join(v.split())
        if not v:
            raise serializers.ValidationError("Customer name is required.")
        return v

    def validate(self, attrs):
        if self.instance is None and not attrs.get("lines"):
            raise serializers.ValidationError({"lines": "Add at least one item."})
        if self.instance is not None and ("lines" in attrs or "coupon_code" in attrs):
            raise serializers.ValidationError("Items and coupon can't be edited after an invoice is created. Cancel it and make a new one.")
        return attrs

    @transaction.atomic
    def create(self, validated):
        raw = validated.pop("lines")
        code = validated.pop("coupon_code", "")
        lines = resolve_lines(raw)
        priced = price_lines(lines, code)
        coupon = priced.pop("coupon")
        order = Order.objects.create(coupon=coupon, coupon_code=coupon.code if coupon else "", **priced, **validated)
        OrderItem.objects.bulk_create([
            OrderItem(order=order, product=l["product"], name=l["name"], unit_price=l["unit_price"],
                      quantity=l["quantity"], line_total=q2(l["unit_price"] * l["quantity"]))
            for l in lines
        ])
        if coupon and order.status != Order.CANCELLED:
            Coupon.objects.filter(pk=coupon.pk).update(used_count=F("used_count") + 1)
        return order

    @transaction.atomic
    def update(self, instance, validated):
        old = instance.status
        order = super().update(instance, validated)
        if order.coupon_id and old != order.status:
            if order.status == Order.CANCELLED:
                Coupon.objects.filter(pk=order.coupon_id, used_count__gt=0).update(used_count=F("used_count") - 1)
            elif old == Order.CANCELLED:
                Coupon.objects.filter(pk=order.coupon_id).update(used_count=F("used_count") + 1)
        return order
