from django.contrib import admin

from .models import AuditLog, Coupon, LoginAttempt, Order, OrderItem, SiteMedia, StoreSettings


class ReadOnly(admin.ModelAdmin):
    """Security logs can be viewed but never edited or deleted from the admin."""

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(LoginAttempt)
class LoginAttemptAdmin(ReadOnly):
    list_display = ("created_at", "username", "success", "blocked", "source", "ip")
    list_filter = ("success", "blocked", "source")
    search_fields = ("username", "ip")


@admin.register(AuditLog)
class AuditLogAdmin(ReadOnly):
    list_display = ("created_at", "user", "action", "target", "summary", "ip")
    list_filter = ("action", "target")
    search_fields = ("user", "summary")


class ItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("invoice_no", "customer_name", "total", "status", "created_at")
    list_filter = ("status", "payment_method")
    search_fields = ("invoice_no", "customer_name", "phone")
    inlines = [ItemInline]


admin.site.register(Coupon)
admin.site.register(SiteMedia)
admin.site.register(StoreSettings)


from .models import Customer, Festival, Reward, RewardPool, Visit  # noqa: E402


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("email", "name", "phone", "login_count", "last_login_at", "is_blocked")
    search_fields = ("email", "name", "phone")


admin.site.register(Festival)
admin.site.register(RewardPool)
admin.site.register(Reward)
admin.site.register(Visit)

