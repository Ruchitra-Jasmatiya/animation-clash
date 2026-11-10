import re

from django.db import transaction
from django.utils import timezone
from django.db.models import F
from rest_framework import serializers

from products.models import Product

from . import services
from .models import Coupon, Customer, Festival, Order, OrderItem, Reward, RewardPool, StoreSettings, q2
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
        priced["festival_discount"] = "0.00"
        return {k: str(v) if not isinstance(v, (bool, str)) else v for k, v in priced.items()}


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    lines = LineInputSerializer(many=True, write_only=True, required=False, max_length=100)
    coupon_code = serializers.CharField(max_length=40, required=False, allow_blank=True)

    class Meta:
        model = Order
        fields = ["id", "invoice_no", "source", "customer", "customer_name", "phone", "email", "address", "status",
                  "payment_method", "payment_status", "upi_ref", "payment_submitted_at", "payment_expires_at", "paid_at",
                  "verified_by", "notes", "coupon_code", "festival_name", "festival_discount", "reward_label",
                  "reward_discount", "loyalty_free", "loyalty_discount", "subtotal", "discount", "shipping", "tax",
                  "total", "gst_percent", "prices_include_gst", "items", "lines", "created_at"]
        read_only_fields = ["id", "invoice_no", "source", "customer", "payment_status", "upi_ref", "payment_submitted_at",
                            "payment_expires_at", "paid_at", "verified_by", "festival_name", "festival_discount",
                            "reward_label", "reward_discount", "loyalty_free", "loyalty_discount", "subtotal", "discount",
                            "shipping", "tax", "total", "gst_percent", "prices_include_gst", "created_at"]

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
        if order.status != Order.CANCELLED:
            services.hold_stock(order)
        if order.status in (Order.PAID, Order.SHIPPED, Order.DELIVERED):
            order.payment_status = Order.PAID_P
            order.paid_at = order.paid_at or timezone.now()
            order.save(update_fields=["payment_status", "paid_at"])
        return order

    @transaction.atomic
    def update(self, instance, validated):
        old = instance.status
        new = validated.get("status", old)
        if old == Order.CANCELLED and new != old and instance.source == "online":
            raise serializers.ValidationError({"status": "A cancelled website order can't be restored. Ask the customer to order again."})
        if new == Order.CANCELLED and old != new:
            instance = services.cancel_order(instance, note="Cancelled by staff")
            validated = {k: v for k, v in validated.items() if k != "status"}
            return super().update(instance, validated)
        order = super().update(instance, validated)
        if old == Order.CANCELLED and new != old:  # a staff invoice brought back
            if order.coupon_id:
                Coupon.objects.filter(pk=order.coupon_id).update(used_count=F("used_count") + 1)
            services.hold_stock(order)
        if new in (Order.PAID, Order.SHIPPED, Order.DELIVERED) and order.payment_status != Order.PAID_P:
            order.payment_status = Order.PAID_P
            order.paid_at = order.paid_at or timezone.now()
            order.save(update_fields=["payment_status", "paid_at"])
        return order


class StoreSettingsAdminSerializer(StoreSettingsSerializer):
    def validate_upi_id(self, v):
        v = v.strip()
        if v and not re.fullmatch(r"[A-Za-z0-9._-]{2,}@[A-Za-z][A-Za-z0-9.-]{1,}", v):
            raise serializers.ValidationError("A UPI ID looks like name@bank.")
        return v


class FestivalSerializer(serializers.ModelSerializer):
    state = serializers.SerializerMethodField()
    days_left = serializers.SerializerMethodField()

    class Meta:
        model = Festival
        fields = ["id", "name", "date", "start_date", "end_date", "discount_percent", "max_discount", "min_order",
                  "tagline", "note", "active", "preset", "state", "days_left"]
        read_only_fields = ["id", "preset", "state", "days_left"]

    def get_state(self, f):
        today = timezone.localdate()
        if f.date < today and f.end_date < today:
            return "past"
        if f.is_live(today):
            return "live"
        if f.active and f.discount_percent > 0:
            return "scheduled"
        return "off"

    def get_days_left(self, f):
        return (f.date - timezone.localdate()).days

    def validate(self, a):
        start = a.get("start_date", getattr(self.instance, "start_date", None))
        end = a.get("end_date", getattr(self.instance, "end_date", None))
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "The offer can't end before it starts."})
        return a


class RewardPoolSerializer(serializers.ModelSerializer):
    shown_as = serializers.SerializerMethodField()

    class Meta:
        model = RewardPool
        fields = ["id", "label", "kind", "value", "max_discount", "min_order", "weight", "valid_days", "active", "shown_as"]
        read_only_fields = ["id", "shown_as"]

    def get_shown_as(self, r):
        return r.display_label()

    def validate(self, a):
        kind = a.get("kind", getattr(self.instance, "kind", "flat"))
        value = a.get("value", getattr(self.instance, "value", 0))
        if kind == "percent" and value > 90:
            raise serializers.ValidationError({"value": "A percent reward can't be above 90."})
        if kind != "shipping" and value <= 0:
            raise serializers.ValidationError({"value": "Enter a value above 0."})
        return a


class CustomerAdminSerializer(serializers.ModelSerializer):
    orders = serializers.IntegerField(source="order_count", read_only=True)
    spent = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, default=0)

    class Meta:
        model = Customer
        fields = ["id", "name", "email", "phone", "address", "is_blocked", "created_at", "last_login_at", "login_count",
                  "last_ip", "orders", "spent"]
        read_only_fields = ["id", "name", "email", "phone", "address", "created_at", "last_login_at", "login_count", "last_ip"]
