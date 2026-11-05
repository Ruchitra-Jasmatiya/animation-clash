from django.core.validators import FileExtensionValidator
from rest_framework import serializers

from .models import ALLOWED_IMAGE_EXTENSIONS, Product, validate_image_ref

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB


class ProductSerializer(serializers.ModelSerializer):
    # write-only inputs
    image = serializers.ImageField(
        write_only=True,
        required=False,
        allow_null=True,
        validators=[FileExtensionValidator(ALLOWED_IMAGE_EXTENSIONS)],
    )
    image_url = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        validators=[validate_image_ref],
    )
    # read-only output the website renders
    image_display = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "price",
            "mrp",
            "description",
            "flavour",
            "size",
            "in_stock",
            "image",
            "image_url",
            "image_display",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_image_display(self, obj):
        return obj.display_image

    def validate_name(self, value):
        value = " ".join(value.split())
        if not value:
            raise serializers.ValidationError("Name can't be empty.")
        return value

    def validate_image(self, f):
        if f and f.size > MAX_UPLOAD_BYTES:
            raise serializers.ValidationError("Image must be 5 MB or smaller.")
        return f

    def validate_image_url(self, value):
        return value.strip()

    def validate(self, attrs):
        inst = self.instance
        price = attrs.get("price", inst.price if inst else None)
        mrp = attrs.get("mrp", inst.mrp if inst else None)
        if mrp is not None and price is not None and mrp < price:
            raise serializers.ValidationError({"mrp": "Original price (MRP) can't be lower than the selling price."})
        has_new_file = bool(attrs.get("image"))
        url_in = "image_url" in attrs
        url = attrs.get("image_url", "") if url_in else (inst.image_url if inst else "")
        keeps_file = bool(inst and inst.image)
        if not (has_new_file or url or keeps_file):
            raise serializers.ValidationError(
                {"image": "Add an image: upload a file or paste an image URL."}
            )
        return attrs

    def create(self, validated_data):
        if validated_data.get("image"):
            validated_data["image_url"] = ""
        return super().create(validated_data)

    def update(self, instance, validated_data):
        new_file = validated_data.get("image")
        new_url = validated_data.get("image_url")
        if new_file:
            validated_data["image_url"] = ""
        if (new_file or new_url) and instance.image:
            # replaced by a new upload / switched to a URL: drop the old file
            instance.image.delete(save=False)
        if not new_file:
            validated_data.pop("image", None)  # never blank an image by accident
        return super().update(instance, validated_data)
