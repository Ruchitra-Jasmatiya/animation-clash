from django.contrib import admin

from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "flavour", "size", "price", "in_stock", "created_at")
    list_filter = ("in_stock", "flavour")
    search_fields = ("name", "description")
