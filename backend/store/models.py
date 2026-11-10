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

    # --- payments (UPI QR) ---
    upi_id = models.CharField("UPI ID", max_length=80, blank=True, help_text="Money from the QR code goes here, e.g. name@okaxis")
    upi_name = models.CharField("Name on UPI", max_length=80, blank=True)
    auto_confirm_payments = models.BooleanField(
        default=False, help_text="If ON, an order counts as paid as soon as the customer says they paid (testing only). If OFF, you confirm each payment.")
    payment_window_minutes = models.PositiveIntegerField(default=30, validators=[MinValueValidator(5), MaxValueValidator(1440)])

    # --- stock + loyalty ---
    low_stock_threshold = models.PositiveIntegerField(default=5)
    loyalty_enabled = models.BooleanField(default=True)
    loyalty_every = models.PositiveIntegerField("Paid orders needed", default=10, validators=[MinValueValidator(1)])
    loyalty_cap = models.DecimalField("Free order limit (Rs)", default=5000, validators=[MinValueValidator(0)], **MONEY)

    # --- invoice wording ---
    hsn_code = models.CharField("HSN code", max_length=12, blank=True, default="2106")
    show_cgst_sgst = models.BooleanField("Show GST as CGST + SGST", default=True)
    terms_conditions = models.TextField(blank=True, default=(
        "1. Prices are in Indian Rupees (INR) and include the taxes shown on this invoice unless stated otherwise.\n"
        "2. Goods once sold can be returned within 7 days of delivery only if the seal is unbroken, the product is unused and this invoice is shown.\n"
        "3. Opened or used nutrition products cannot be returned for hygiene and safety reasons.\n"
        "4. If a product arrives damaged or wrong, tell us within 48 hours of delivery with photos and we will replace it or refund you.\n"
        "5. Refunds are made to the original payment method within 5-7 working days after the returned goods are received.\n"
        "6. Delivery dates are estimates and may change because of courier delays, weather or festivals.\n"
        "7. Offers, coupons and rewards are for the customer account they were issued to, cannot be exchanged for cash and can be withdrawn on misuse.\n"
        "8. This is a computer-generated invoice and needs no signature. Disputes are subject to the courts of the seller's city."))
    return_policy = models.TextField(blank=True, default=(
        "Easy 7-day returns on sealed products. Write to us with your invoice number and we will arrange the pickup."))
    declaration = models.TextField(blank=True, default=(
        "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."))
    signatory = models.CharField(max_length=80, blank=True, default="Authorised Signatory")

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
    METHODS = [("cash", "Cash"), ("upi", "UPI"), ("card", "Card"), ("bank", "Bank transfer"), ("cod", "Cash on delivery"),
               ("loyalty", "Free order reward")]
    UNPAID, SUBMITTED, PAID_P, REJECTED = "unpaid", "submitted", "paid", "rejected"
    PAYMENT_STATUSES = [(UNPAID, "Unpaid"), (SUBMITTED, "Payment to verify"), (PAID_P, "Paid"), (REJECTED, "Payment not found")]
    SOURCES = [("manual", "Created by staff"), ("online", "Website order")]

    invoice_no = models.CharField(max_length=30, unique=True, blank=True)
    customer_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUSES, default=PENDING)
    payment_method = models.CharField(max_length=10, choices=METHODS, default="cash")
    notes = models.TextField(blank=True)

    source = models.CharField(max_length=10, choices=SOURCES, default="manual")
    customer = models.ForeignKey("Customer", null=True, blank=True, on_delete=models.SET_NULL, related_name="orders")
    payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUSES, default=UNPAID)
    upi_ref = models.CharField("UPI reference (UTR)", max_length=40, blank=True)
    payment_submitted_at = models.DateTimeField(null=True, blank=True)
    payment_expires_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.CharField(max_length=150, blank=True)
    stock_held = models.BooleanField(default=False)

    coupon = models.ForeignKey(Coupon, null=True, blank=True, on_delete=models.SET_NULL, related_name="orders")
    coupon_code = models.CharField(max_length=40, blank=True)
    festival_name = models.CharField(max_length=80, blank=True)
    festival_discount = models.DecimalField(default=0, **MONEY)
    reward = models.ForeignKey("Reward", null=True, blank=True, on_delete=models.SET_NULL, related_name="used_on_orders")
    reward_label = models.CharField(max_length=80, blank=True)
    reward_discount = models.DecimalField(default=0, **MONEY)
    loyalty_free = models.BooleanField(default=False)
    loyalty_discount = models.DecimalField(default=0, **MONEY)
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


# =====================================================================
#  Customers (website sign-up / login by e-mail OTP)
# =====================================================================
class Customer(models.Model):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    is_blocked = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    last_login_at = models.DateTimeField(null=True, blank=True)
    login_count = models.PositiveIntegerField(default=0)
    last_ip = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.name} <{self.email}>"

    # DRF treats request.user like a user object
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    is_staff = False


class CustomerToken(models.Model):
    """One signed-in device. Only a hash of the token is stored, and it lasts a year while the site keeps being used."""

    key_hash = models.CharField(max_length=64, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="tokens")
    created_at = models.DateTimeField(default=timezone.now)
    last_used_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    user_agent = models.CharField(max_length=300, blank=True)
    ip = models.CharField(max_length=64, blank=True)


class OtpCode(models.Model):
    LOGIN, SIGNUP = "login", "signup"

    email = models.EmailField(db_index=True)
    purpose = models.CharField(max_length=8, default=LOGIN)
    code_hash = models.CharField(max_length=64)
    name = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    used = models.BooleanField(default=False)
    ip = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at", "-id"]


class CustomerLogin(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="logins")
    ip = models.CharField(max_length=64, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class CartItem(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="cart_items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="+")
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = [("customer", "product")]
        ordering = ["added_at", "id"]


class WishlistItem(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="wishlist_items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="+")
    added_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = [("customer", "product")]
        ordering = ["-added_at", "-id"]


# =====================================================================
#  Offers: Indian festivals + scratch-card rewards
# =====================================================================
class Festival(models.Model):
    name = models.CharField(max_length=80)
    date = models.DateField(help_text="The day of the festival")
    start_date = models.DateField(help_text="Offer starts")
    end_date = models.DateField(help_text="Offer ends (included)")
    discount_percent = models.DecimalField(default=0, max_digits=5, decimal_places=2,
                                           validators=[MinValueValidator(0), MaxValueValidator(90)])
    max_discount = models.DecimalField(null=True, blank=True, validators=[MinValueValidator(0)], **MONEY)
    min_order = models.DecimalField(default=0, validators=[MinValueValidator(0)], **MONEY)
    tagline = models.CharField(max_length=140, blank=True)
    note = models.CharField(max_length=140, blank=True, help_text="e.g. date depends on moon sighting")
    active = models.BooleanField(default=False)
    preset = models.BooleanField(default=False)

    class Meta:
        ordering = ["date", "id"]

    def __str__(self):
        return f"{self.name} {self.date}"

    def is_live(self, today=None):
        today = today or timezone.localdate()
        return self.active and self.discount_percent > 0 and self.start_date <= today <= self.end_date

    def discount_for(self, subtotal):
        subtotal = Decimal(subtotal)
        if subtotal < self.min_order:
            return Decimal("0")
        amount = subtotal * Decimal(self.discount_percent) / Decimal(100)
        if self.max_discount is not None:
            amount = min(amount, self.max_discount)
        return q2(min(amount, subtotal))


class RewardPool(models.Model):
    """What a scratch card can turn out to be. Higher weight = shows up more often."""

    FLAT, PERCENT, SHIPPING = "flat", "percent", "shipping"
    KINDS = [(FLAT, "Rupees off"), (PERCENT, "Percent off"), (SHIPPING, "Free shipping")]

    label = models.CharField(max_length=60, blank=True)
    kind = models.CharField(max_length=10, choices=KINDS, default=FLAT)
    value = models.DecimalField(default=0, validators=[MinValueValidator(0)], **MONEY)
    max_discount = models.DecimalField(null=True, blank=True, validators=[MinValueValidator(0)], **MONEY)
    min_order = models.DecimalField(default=0, validators=[MinValueValidator(0)], **MONEY)
    weight = models.PositiveIntegerField(default=10, validators=[MinValueValidator(1)])
    valid_days = models.PositiveIntegerField(default=30, validators=[MinValueValidator(1)])
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["kind", "value", "id"]

    def display_label(self):
        if self.label:
            return self.label
        if self.kind == self.FLAT:
            return f"Rs {Decimal(self.value).normalize():f} off"
        if self.kind == self.PERCENT:
            return f"{Decimal(self.value).normalize():f}% off"
        return "Free shipping"


class Reward(models.Model):
    """A scratch card a customer earned. The prize is drawn on the server; it is hidden until scratched."""

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="rewards")
    source_order = models.ForeignKey(Order, null=True, blank=True, on_delete=models.SET_NULL, related_name="rewards_earned")
    label = models.CharField(max_length=60)
    kind = models.CharField(max_length=10, choices=RewardPool.KINDS)
    value = models.DecimalField(default=0, **MONEY)
    max_discount = models.DecimalField(null=True, blank=True, **MONEY)
    min_order = models.DecimalField(default=0, **MONEY)
    valid_until = models.DateTimeField()
    revealed = models.BooleanField(default=False)
    revealed_at = models.DateTimeField(null=True, blank=True)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at", "-id"]

    @property
    def status(self):
        if self.used_at:
            return "used"
        if timezone.now() > self.valid_until:
            return "expired"
        return "available" if self.revealed else "unscratched"

    def discount_for(self, subtotal):
        """Item discount this reward gives on `subtotal` (free shipping gives 0 here - it removes the shipping fee)."""
        subtotal = Decimal(subtotal)
        if self.kind == RewardPool.SHIPPING or subtotal < self.min_order:
            return Decimal("0")
        if self.kind == RewardPool.FLAT:
            amount = Decimal(self.value)
        else:
            amount = subtotal * Decimal(self.value) / Decimal(100)
            if self.max_discount is not None:
                amount = min(amount, self.max_discount)
        return q2(min(amount, subtotal))


# =====================================================================
#  Visitors
# =====================================================================
class Visit(models.Model):
    visitor_id = models.CharField(max_length=40, db_index=True)
    customer = models.ForeignKey(Customer, null=True, blank=True, on_delete=models.SET_NULL, related_name="visits")
    path = models.CharField(max_length=200)
    device = models.CharField(max_length=10, default="desktop")
    ip = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]
