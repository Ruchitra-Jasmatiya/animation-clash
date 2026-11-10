"""Staff-only endpoints for the /manage panel: customers, festivals, scratch-card rewards, analytics."""
from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .audit import audit
from .models import Customer, CustomerLogin, Festival, Order, OtpCode, Reward, RewardPool, Visit
from .serializers import CustomerAdminSerializer, FestivalSerializer, OrderSerializer, RewardPoolSerializer
from .views import STAFF, StaffViewSet


class CustomerViewSet(StaffViewSet):
    """Everyone who signed up. Staff can see them and block/unblock - nothing else."""

    serializer_class = CustomerAdminSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        qs = Customer.objects.annotate(
            order_count=Count("orders", filter=~Q(orders__status="cancelled"), distinct=True),
            spent=Sum("orders__total", filter=Q(orders__payment_status="paid") & ~Q(orders__status="cancelled")))
        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(email__icontains=q) | Q(phone__icontains=q))
        return qs

    def retrieve(self, request, *args, **kwargs):
        c = self.get_object()
        data = self.get_serializer(c).data
        data["recent_orders"] = OrderSerializer(c.orders.prefetch_related("items")[:15], many=True).data
        data["logins"] = [{"at": l.created_at, "ip": l.ip, "user_agent": l.user_agent} for l in c.logins.all()[:20]]
        data["cart_items"] = c.cart_items.aggregate(n=Sum("quantity"))["n"] or 0
        data["wishlist_items"] = c.wishlist_items.count()
        data["scratch_cards"] = [{"label": r.label, "status": r.status, "created_at": r.created_at} for r in c.rewards.all()[:20]]
        return Response(data)

    def perform_update(self, serializer):
        c = serializer.save()
        if c.is_blocked:
            c.tokens.all().delete()  # signs them out everywhere
        audit(self.request, "update", "customer", f"{'Blocked' if c.is_blocked else 'Unblocked'} customer {c.email}")


class FestivalViewSet(StaffViewSet):
    queryset = Festival.objects.all()
    serializer_class = FestivalSerializer

    def perform_create(self, serializer):
        f = serializer.save()
        audit(self.request, "create", "festival", f"Added festival offer {f.name}")

    def perform_update(self, serializer):
        f = serializer.save()
        audit(self.request, "update", "festival", f"Edited festival offer {f.name} ({f.discount_percent}%, {'on' if f.active else 'off'})")

    def perform_destroy(self, instance):
        name = instance.name
        instance.delete()
        audit(self.request, "delete", "festival", f"Deleted festival {name}")


class RewardPoolViewSet(StaffViewSet):
    queryset = RewardPool.objects.all()
    serializer_class = RewardPoolSerializer

    def perform_create(self, serializer):
        r = serializer.save()
        audit(self.request, "create", "reward", f"Added scratch-card prize {r.display_label()}")

    def perform_update(self, serializer):
        r = serializer.save()
        audit(self.request, "update", "reward", f"Edited scratch-card prize {r.display_label()}")

    def perform_destroy(self, instance):
        label = instance.display_label()
        instance.delete()
        audit(self.request, "delete", "reward", f"Deleted scratch-card prize {label}")


class AnalyticsView(APIView):
    """Visitors, sign-ups and logins - who is using the website."""

    authentication_classes = STAFF["authentication_classes"]
    permission_classes = STAFF["permission_classes"]

    def get(self, request):
        now = timezone.now()
        today = timezone.localdate()
        days = 14
        start = today - timedelta(days=days - 1)

        def uniq(qs):
            return qs.values("visitor_id").distinct().count()

        visits = Visit.objects.all()
        per_day = {r["d"]: r for r in visits.filter(created_at__date__gte=start).annotate(d=TruncDate("created_at"))
                   .values("d").annotate(views=Count("id"))}
        uniq_day = {r["d"]: r["u"] for r in visits.filter(created_at__date__gte=start).annotate(d=TruncDate("created_at"))
                    .values("d").annotate(u=Count("visitor_id", distinct=True))}
        signups = {r["d"]: r["n"] for r in Customer.objects.filter(created_at__date__gte=start)
                   .annotate(d=TruncDate("created_at")).values("d").annotate(n=Count("id"))}
        logins = {r["d"]: r["n"] for r in CustomerLogin.objects.filter(created_at__date__gte=start)
                  .annotate(d=TruncDate("created_at")).values("d").annotate(n=Count("id"))}
        series = []
        for i in range(days):
            d = start + timedelta(days=i)
            series.append({"date": d.isoformat(), "views": per_day.get(d, {}).get("views", 0), "visitors": uniq_day.get(d, 0),
                           "signups": signups.get(d, 0), "logins": logins.get(d, 0)})

        top_pages = list(visits.filter(created_at__gte=now - timedelta(days=days)).values("path").annotate(n=Count("id")).order_by("-n")[:8])
        devices = {r["device"]: r["n"] for r in visits.filter(created_at__gte=now - timedelta(days=days)).values("device").annotate(n=Count("id"))}
        return Response({
            "visitors_total": uniq(visits), "visitors_today": uniq(visits.filter(created_at__date=today)),
            "visitors_yesterday": uniq(visits.filter(created_at__date=today - timedelta(days=1))),
            "page_views_total": visits.count(), "page_views_today": visits.filter(created_at__date=today).count(),
            "online_now": uniq(visits.filter(created_at__gte=now - timedelta(minutes=5))),
            "customers_total": Customer.objects.count(), "customers_today": Customer.objects.filter(created_at__date=today).count(),
            "emails_logged_in": CustomerLogin.objects.values("customer").distinct().count(),
            "logins_total": CustomerLogin.objects.count(), "logins_today": CustomerLogin.objects.filter(created_at__date=today).count(),
            "otp_sent_today": OtpCode.objects.filter(created_at__date=today).count(),
            "otp_verified_today": OtpCode.objects.filter(created_at__date=today, used=True).exclude(attempts__gte=5).count(),
            "orders_online": Order.objects.filter(source="online").exclude(status="cancelled").count(),
            "scratch_cards_given": Reward.objects.count(), "scratch_cards_scratched": Reward.objects.filter(revealed=True).count(),
            "series": series, "top_pages": top_pages, "devices": devices,
            "recent_logins": [{"name": l.customer.name, "email": l.customer.email, "at": l.created_at, "ip": l.ip,
                               "user_agent": l.user_agent} for l in CustomerLogin.objects.select_related("customer")[:15]],
        })
