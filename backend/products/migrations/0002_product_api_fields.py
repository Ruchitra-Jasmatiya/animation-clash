import django.core.validators
import django.utils.timezone
from django.db import migrations, models

import products.models


class Migration(migrations.Migration):
    dependencies = [("products", "0001_initial")]

    operations = [
        migrations.AlterModelOptions(name="product", options={"ordering": ["-created_at", "-id"]}),
        migrations.AddField(
            model_name="product", name="flavour",
            field=models.CharField(blank=True, default="Pistachio", max_length=80),
        ),
        migrations.AddField(
            model_name="product", name="size",
            field=models.CharField(blank=True, max_length=40),
        ),
        migrations.AddField(
            model_name="product", name="in_stock",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="product", name="image_url",
            field=models.CharField(
                blank=True, max_length=500,
                validators=[products.models.validate_image_ref],
            ),
        ),
        migrations.AddField(
            model_name="product", name="created_at",
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="product", name="updated_at",
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="product", name="price",
            field=models.DecimalField(
                decimal_places=2, max_digits=10,
                validators=[django.core.validators.MinValueValidator(0)],
            ),
        ),
        migrations.AlterField(
            model_name="product", name="image",
            field=models.ImageField(
                blank=True, upload_to="products/",
                validators=[django.core.validators.FileExtensionValidator(
                    ["jpg", "jpeg", "png", "webp", "gif", "avif"])],
            ),
        ),
    ]
