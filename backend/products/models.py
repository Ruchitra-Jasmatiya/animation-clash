from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator, MinValueValidator
from django.db import models


def validate_image_ref(value):
    """An image reference is either an http(s) URL or a site-relative path."""
    value = (value or "").strip()
    if not value:
        return
    if value.startswith("//"):
        raise ValidationError("Protocol-relative URLs are not allowed.")
    if not (value.startswith(("http://", "https://")) or value.startswith("/")):
        raise ValidationError("Use a full http(s) image URL.")


ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "avif"]


class Product(models.Model):
    name = models.CharField(max_length=200)
    price = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )
    mrp = models.DecimalField(
        "Original price (MRP)", max_digits=10, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(0)],
        help_text="Optional. If higher than the price, the site shows it struck through with a % off badge.",
    )
    description = models.TextField(blank=True)
    flavour = models.CharField(max_length=80, blank=True, default="Pistachio")
    size = models.CharField(max_length=40, blank=True)
    in_stock = models.BooleanField(default=True)
    stock = models.PositiveIntegerField(default=50, help_text="How many units you have. Orders reduce it; at 0 the site shows Sold out.")

    # Either an uploaded file or an image URL (an upload wins when both exist).
    image = models.ImageField(
        upload_to="products/",
        blank=True,
        validators=[FileExtensionValidator(ALLOWED_IMAGE_EXTENSIONS)],
    )
    image_url = models.CharField(
        max_length=500, blank=True, validators=[validate_image_ref]
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.name

    @property
    def available(self):
        return bool(self.in_stock and self.stock > 0)

    @property
    def display_image(self):
        """Path/URL the frontend should render (relative for uploads)."""
        if self.image:
            return self.image.url
        return self.image_url
