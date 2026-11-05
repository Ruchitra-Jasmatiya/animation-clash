import io
import os
from datetime import timedelta
from decimal import Decimal

from django.core.files.base import ContentFile
from django.db.models import Count, F, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from PIL import Image
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from products.models import Product, validate_image_ref
from products.views import IsStaff

from .audit import audit
from .auth import ExpiringTokenAuthentication
from .models import AuditLog, Coupon, LoginAttempt, Order, OrderItem, SiteMedia, StoreSettings, q2
from .serializers import CouponSerializer, OrderSerializer, PreviewSerializer, StoreSettingsSerializer
from .slots import SLOT_INDEX, SLOTS

STAFF = {"authentication_classes": [ExpiringTokenAuthentication], "permission_classes": [IsStaff]}
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
VIDEO_EXT = {".mp4", ".webm"}
MAX_IMAGE = 8 * 1024 * 1024
MAX_VIDEO = 60 * 1024 * 1024


class StaffViewSet(viewsets.ModelViewSet):
    authentication_classes = STAFF["authentication_classes"]
    permission_classes = STAFF["permission_classes"]
    pagination_class = None


class OrderViewSet(StaffViewSet):
    serializer_class = OrderSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = Order.objects.prefetch_related("items")
        st = self.request.query_params.get("status")
        if st:
            qs = qs.filter(status=st)
        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(invoice_no__icontains=q) | Q(customer_name__icontains=q) | Q(phone__icontains=q))
        return qs[:500] if self.action == "list" else qs

    def perform_create(self, serializer):
        o = serializer.save()
        audit(self.request, "create", "invoice", f"Created invoice {o.invoice_no} for {o.customer_name} (₹{o.total})")

    def perform_update(self, serializer):
        o = serializer.save()
        audit(self.request, "update", "invoice", f"Updated invoice {o.invoice_no} (status: {o.status})")

    def perform_destroy(self, instance):
        no = instance.invoice_no
        if instance.coupon_id and instance.status != Order.CANCELLED:
            Coupon.objects.filter(pk=instance.coupon_id, used_count__gt=0).update(used_count=F("used_count") - 1)
        instance.delete()
        audit(self.request, "delete", "invoice", f"Deleted invoice {no}")

    @action(detail=False, methods=["post"])
    def preview(self, request):
        s = PreviewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(s.totals())


class CouponViewSet(StaffViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer

    def perform_create(self, serializer):
        c = serializer.save()
        audit(self.request, "create", "coupon", f"Created coupon {c.code}")

    def perform_update(self, serializer):
        c = serializer.save()
        audit(self.request, "update", "coupon", f"Edited coupon {c.code}")

    def perform_destroy(self, instance):
        code = instance.code
        instance.delete()
        audit(self.request, "delete", "coupon", f"Deleted coupon {code}")


class CouponValidateView(APIView):
    """Public: lets a future checkout ask 'is this code good for this subtotal?'. Throttled against guessing."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "coupon"

    def post(self, request):
        code = str(request.data.get("code", "")).strip()[:40]
        try:
            subtotal = Decimal(str(request.data.get("subtotal", "0")))
        except Exception:
            return Response({"valid": False, "message": "Invalid amount."}, status=400)
        coupon = Coupon.objects.filter(code__iexact=code).first() if code else None
        if not coupon:
            return Response({"valid": False, "message": "That coupon code doesn't exist.", "discount": "0.00"})
        ok, message, discount = coupon.evaluate(subtotal)
        return Response({"valid": ok, "message": message, "discount": str(discount)})


class SettingsView(APIView):
    authentication_classes = STAFF["authentication_classes"]
    permission_classes = STAFF["permission_classes"]

    def get(self, request):
        return Response(StoreSettingsSerializer(StoreSettings.load()).data)

    def put(self, request):
        s = StoreSettingsSerializer(StoreSettings.load(), data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        audit(request, "update", "settings", "Changed store settings")
        return Response(s.data)


# ---------------- site media (home / shop images & videos) ----------------
def _media_item(slot_key, row):
    meta = dict(SLOT_INDEX[slot_key])
    meta["url"] = (row.display_url if row else "") or None
    meta["custom"] = bool(row and row.display_url)
    return meta


class SiteMediaListView(APIView):
    """Public: the website reads this to know which images/videos to show."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        rows = {m.slot: m for m in SiteMedia.objects.all()}
        return Response([_media_item(k, rows.get(k)) for k, *_ in SLOTS])


class SiteMediaDetailView(APIView):
    authentication_classes = STAFF["authentication_classes"]
    permission_classes = STAFF["permission_classes"]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _slot(self, slot):
        if slot not in SLOT_INDEX:
            raise serializers.ValidationError({"slot": "Unknown slot."})
        return SLOT_INDEX[slot]

    def put(self, request, slot):
        meta = self._slot(slot)
        kind = meta["kind"]
        upload = request.FILES.get("file")
        url = str(request.data.get("url", "")).strip()
        if not upload and not url:
            raise serializers.ValidationError({"detail": "Upload a file or paste a link."})

        row, _ = SiteMedia.objects.get_or_create(slot=slot)
        if upload:
            ext = os.path.splitext(upload.name)[1].lower()
            allowed = IMAGE_EXT if kind == "image" else VIDEO_EXT
            if ext not in allowed:
                raise serializers.ValidationError({"detail": f"This slot needs a {kind}: {', '.join(sorted(allowed))}"})
            if upload.size > (MAX_IMAGE if kind == "image" else MAX_VIDEO):
                raise serializers.ValidationError({"detail": f"File too large (max {8 if kind == 'image' else 60} MB)."})
            if kind == "image" and ext != ".avif":
                try:
                    Image.open(io.BytesIO(upload.read())).verify()
                except Exception:
                    raise serializers.ValidationError({"detail": "That file isn't a valid image."})
                upload.seek(0)
            if row.file:
                row.file.delete(save=False)
            row.file.save(f"{slot}{ext}", ContentFile(upload.read()), save=False)
            row.url = ""
        else:
            try:
                validate_image_ref(url)
            except Exception:
                raise serializers.ValidationError({"detail": "Use a full http(s) link."})
            if row.file:
                row.file.delete(save=False)
                row.file = ""
            row.url = url
        row.save()
        audit(request, "update", "site-media", f"Changed {meta['label']}")
        return Response(_media_item(slot, row))

    def delete(self, request, slot):
        meta = self._slot(slot)
        row = SiteMedia.objects.filter(slot=slot).first()
        if row:
            if row.file:
                row.file.delete(save=False)
            row.delete()
        audit(request, "delete", "site-media", f"Reset {meta['label']} to default")
        return Response(_media_item(slot, None))


# ---------------- dashboard + logs ----------------
class DashboardView(APIView):
    authentication_classes = STAFF["authentication_classes"]
    permission_classes = STAFF["permission_classes"]

    def get(self, request):
        live = Order.objects.exclude(status=Order.CANCELLED)
        today = timezone.localdate()
        start = today - timedelta(days=13)
        by_day = {
            r["d"]: r for r in live.filter(created_at__date__gte=start)
            .annotate(d=TruncDate("created_at")).values("d").annotate(revenue=Sum("total"), orders=Count("id"))
        }
        daily = []
        for i in range(14):
            d = start + timedelta(days=i)
            r = by_day.get(d)
            daily.append({"date": d.isoformat(), "revenue": str(r["revenue"]) if r else "0.00", "orders": r["orders"] if r else 0})
        top = (OrderItem.objects.exclude(order__status=Order.CANCELLED).values("name")
               .annotate(qty=Sum("quantity"), revenue=Sum("line_total")).order_by("-qty")[:5])
        return Response({
            "revenue": str(live.aggregate(t=Sum("total"))["t"] or "0.00"),
            "orders": live.count(),
            "pending": Order.objects.filter(status=Order.PENDING).count(),
            "products": Product.objects.count(),
            "active_coupons": Coupon.objects.filter(active=True).count(),
            "daily": daily,
            "top_products": [{"name": t["name"], "qty": t["qty"], "revenue": str(t["revenue"])} for t in top],
            "recent": OrderSerializer(Order.objects.prefetch_related("items")[:5], many=True).data,
        })


class LogsView(APIView):
    """Staff-only security log: every sign-in attempt and every change."""

    authentication_classes = STAFF["authentication_classes"]
    permission_classes = STAFF["permission_classes"]

    def get(self, request):
        kind = request.query_params.get("type", "logins")
        try:
            limit = max(1, min(int(request.query_params.get("limit", 200)), 500))
        except ValueError:
            limit = 200
        if kind == "activity":
            rows = AuditLog.objects.all()[:limit]
            return Response([{"id": r.id, "user": r.user, "action": r.action, "target": r.target,
                              "summary": r.summary, "ip": r.ip, "at": r.created_at} for r in rows])
        rows = LoginAttempt.objects.all()[:limit]
        failed24 = LoginAttempt.objects.filter(success=False, created_at__gte=timezone.now() - timedelta(hours=24)).count()
        return Response({"failed_24h": failed24, "rows": [
            {"id": r.id, "username": r.username, "success": r.success, "blocked": r.blocked, "source": r.source,
             "ip": r.ip, "user_agent": r.user_agent, "at": r.created_at} for r in rows]})
