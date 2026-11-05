from decimal import ROUND_HALF_UP, Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from products.models import Product, validate_image_ref

MONEY = {"max_digits": 10, "decimal_places": 2}


def q2(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class StoreSettings(models.Model):
    """One row only (pk=1). Used on invoices and for tax/shipping maths."""

    store_name = models.CharField(max_length=100, default="MASSUP")
    tagline = models.CharField(max_length=120, blank=True, default="Fuel your better")
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    gstin = models.CharField("GSTIN", max_length=20, blank=True)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                      validators=[MinValueValidator(0), MaxValueValidator(100)])
    prices_include_gst = models.BooleanField(default=True)
    shipping_fee = models.DecimalField(default=0, validators=[MinValueValidator(0)], **MONEY)
    free_shipping_above = models.DecimalField(default=0, validators=[MinValueValidator(0)], **MONEY,
                                              help_text="0 = never free")
    invoice_footer = models.TextField(blank=True, default="Thank you for shopping with MASSUP.")

    class Meta:
        verbose_name_plural = "store settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        return cls.objects.get_or_create(pk=1)[0]

    def __str__(self):
        return self.store_name


class SiteMedia(models.Model):
    """An admin-supplied replacement for one image/video slot (see slots.py)."""

    slot = models.CharField(max_length=60, unique=True)
    file = models.FileField(upload_to="site/", blank=True)
    url = models.CharField(max_length=500, blank=True, validators=[validate_image_ref])
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.slot

    @property
    def display_url(self):
        return self.file.url if self.file else self.url


class Coupon(models.Model):
    PERCENT, FLAT = "percent", "flat"
    TYPES = [(PERCENT, "Percent off"), (FLAT, "Flat amount off")]

    code = models.CharField(max_length=40, unique=True)
    description = models.CharField(max_length=200, blank=True)
    discount_type = models.CharField(max_length=8, choices=TYPES, default=PERCENT)
    value = models.DecimalField(validators=[MinValueValidator(Decimal("0.01"))], **MONEY)
    min_order = models.DecimalField(default=0, validators=[MinValueValidator(0)], **MONEY)
    max_discount = models.DecimalField(null=True, blank=True, validators=[MinValueValidator(0)], **MONEY,
                                       help_text="Cap for percent coupons")
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    used_count = models.PositiveIntegerField(default=0)
    starts_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        self.code = (self.code or "").strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.code

    def evaluate(self, subtotal, now=None):
        """Return (ok, message, discount_amount)."""
        now = now or timezone.now()
        subtotal = Decimal(subtotal)
        if not self.active:
            return False, "This coupon is not active.", Decimal("0")
        if self.starts_at and now < self.starts_at:
            return False, "This coupon is not valid yet.", Decimal("0")
        if self.expires_at and now > self.expires_at:
            return False, "This coupon has expired.", Decimal("0")
        if self.usage_limit is not None and self.used_count >= self.usage_limit:
            return False, "This coupon has been fully used.", Decimal("0")
        if subtotal < self.min_order:
            return False, f"Spend at least ₹{Decimal(self.min_order).normalize():f} to use this coupon.", Decimal("0")
        if self.discount_type == self.PERCENT:
            amount = subtotal * self.value / Decimal(100)
            if self.max_discount is not None:
                amount = min(amount, self.max_discount)
        else:
            amount = self.value
        amount = q2(min(amount, subtotal))
        return True, "Coupon applied.", amount


class Order(models.Model):
    PENDING, PAID, SHIPPED, DELIVERED, CANCELLED = "pending", "paid", "shipped", "delivered", "cancelled"
    STATUSES = [(PENDING, "Pending"), (PAID, "Paid"), (SHIPPED, "Shipped"),
                (DELIVERED, "Delivered"), (CANCELLED, "Cancelled")]
    METHODS = [("cash", "Cash"), ("upi", "UPI"), ("card", "Card"), ("bank", "Bank transfer"), ("cod", "Cash on delivery")]

    invoice_no = models.CharField(max_length=30, unique=True, blank=True)
    customer_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUSES, default=PENDING)
    payment_method = models.CharField(max_length=10, choices=METHODS, default="cash")
    notes = models.TextField(blank=True)

    coupon = models.ForeignKey(Coupon, null=True, blank=True, on_delete=models.SET_NULL, related_name="orders")
    coupon_code = models.CharField(max_length=40, blank=True)
    subtotal = models.DecimalField(default=0, **MONEY)
    discount = models.DecimalField(default=0, **MONEY)
    shipping = models.DecimalField(default=0, **MONEY)
    tax = models.DecimalField(default=0, **MONEY)
    total = models.DecimalField(default=0, **MONEY)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    prices_include_gst = models.BooleanField(default=True)

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.invoice_no or f"Order {self.pk}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.invoice_no:
            self.invoice_no = f"MU-{self.created_at.year}-{self.pk:04d}"
            super().save(update_fields=["invoice_no"])


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    name = models.CharField(max_length=200)
    unit_price = models.DecimalField(**MONEY)
    quantity = models.PositiveIntegerField(default=1)
    line_total = models.DecimalField(**MONEY)

    def __str__(self):
        return f"{self.name} × {self.quantity}"


class LoginAttempt(models.Model):
    """Every sign-in try (website manager and Django /admin): who, from where, did it work."""

    username = models.CharField(max_length=150, blank=True)
    success = models.BooleanField(default=False)
    blocked = models.BooleanField(default=False)
    source = models.CharField(max_length=20, default="manager")
    ip = models.CharField(max_length=64, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.username} {'OK' if self.success else 'FAILED'} {self.created_at:%Y-%m-%d %H:%M}"


class AuditLog(models.Model):
    """What every signed-in staff member created, changed or deleted."""

    user = models.CharField(max_length=150, blank=True)
    action = models.CharField(max_length=30)
    target = models.CharField(max_length=60, blank=True)
    summary = models.CharField(max_length=300, blank=True)
    ip = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.user} {self.action} {self.target}"
