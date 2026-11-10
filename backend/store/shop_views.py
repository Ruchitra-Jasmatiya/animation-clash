"""Everything the website's customers can do: sign up / log in with an e-mail code, cart, wishlist, orders, rewards."""
import re
from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from products.models import Product

from . import services
from .audit import client_ip
from .auth import CustomerTokenAuthentication, OptionalCustomerAuthentication
from .models import (CartItem, Customer, CustomerToken, Festival, Order, OtpCode, Reward, StoreSettings, Visit,
                     WishlistItem, q2)
from .serializers import OrderSerializer

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")


class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        return isinstance(request.user, Customer)


class CustomerAPI(APIView):
    authentication_classes = [CustomerTokenAuthentication]
    permission_classes = [IsCustomer]


def clean_email(v):
    v = str(v or "").strip().lower()
    if len(v) > 254 or not EMAIL_RE.match(v):
        raise serializers.ValidationError({"email": "Enter a valid e-mail address."})
    return v


def clean_phone(v, required=False):
    v = re.sub(r"[\s-]", "", str(v or ""))
    if v.startswith("+91"):
        v = v[3:]
    if not v and not required:
        return ""
    if not re.fullmatch(r"[6-9]\d{9}", v):
        raise serializers.ValidationError({"phone": "Enter a valid 10-digit mobile number."})
    return v


def customer_json(c):
    return {"id": c.id, "name": c.name, "email": c.email, "phone": c.phone, "address": c.address, "joined": c.created_at}


# ------------------------------------------------------------------ auth
class SignupView(APIView):
    authentication_classes, permission_classes = [], [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp"

    def post(self, request):
        email = clean_email(request.data.get("email"))
        name = " ".join(str(request.data.get("name", "")).split())[:120]
        if len(name) < 2:
            raise serializers.ValidationError({"name": "Please enter your name."})
        phone = clean_phone(request.data.get("phone"))
        if Customer.objects.filter(email=email).exists():
            return Response({"detail": "This e-mail is already registered. Please log in instead.", "code": "exists"}, status=409)
        services.issue_otp(request, email, OtpCode.SIGNUP, name=name, phone=phone)
        return Response({"sent": True, "email": email})


class LoginRequestView(APIView):
    authentication_classes, permission_classes = [], [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp"

    def post(self, request):
        email = clean_email(request.data.get("email"))
        c = Customer.objects.filter(email=email).first()
        if c is None:
            return Response({"detail": "No account with this e-mail. Please sign up first.", "code": "missing"}, status=404)
        if c.is_blocked:
            return Response({"detail": "This account has been blocked. Please contact the store."}, status=403)
        services.issue_otp(request, email, OtpCode.LOGIN)
        return Response({"sent": True, "email": email})


class VerifyView(APIView):
    authentication_classes, permission_classes = [], [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp"

    def post(self, request):
        email = clean_email(request.data.get("email"))
        code = str(request.data.get("code", "")).strip()
        if not re.fullmatch(r"\d{6}", code):
            raise serializers.ValidationError({"detail": "Enter the 6-digit code from your e-mail."})
        row = services.check_otp(email, code)
        c = Customer.objects.filter(email=email).first()
        if row.purpose == OtpCode.SIGNUP and c is None:
            c = Customer.objects.create(email=email, name=row.name or email.split("@")[0], phone=row.phone)
        elif c is None:
            raise serializers.ValidationError({"detail": "No account with this e-mail. Please sign up first."})
        if c.is_blocked:
            return Response({"detail": "This account has been blocked. Please contact the store."}, status=403)
        token = services.start_session(request, c)
        c.refresh_from_db()
        return Response({"token": token, "customer": customer_json(c), "new": row.purpose == OtpCode.SIGNUP})


class LogoutView(CustomerAPI):
    def post(self, request):
        if isinstance(request.auth, CustomerToken):
            request.auth.delete()
        return Response(status=204)


class MeView(CustomerAPI):
    def get(self, request):
        return Response(customer_json(request.user))

    def patch(self, request):
        c = request.user
        if "name" in request.data:
            name = " ".join(str(request.data["name"]).split())[:120]
            if len(name) < 2:
                raise serializers.ValidationError({"name": "Please enter your name."})
            c.name = name
        if "phone" in request.data:
            c.phone = clean_phone(request.data["phone"])
        if "address" in request.data:
            c.address = str(request.data["address"]).strip()[:600]
        c.save()
        return Response(customer_json(c))


class SummaryView(CustomerAPI):
    """The little numbers in the navbar."""

    def get(self, request):
        c = request.user
        services.expire_stale_orders()
        loyalty = services.loyalty_status(c)
        return Response({
            "cart": CartItem.objects.filter(customer=c).aggregate(n=Sum("quantity"))["n"] or 0,
            "wishlist": c.wishlist_items.count(),
            "orders": c.orders.count(),
            "scratch_cards": sum(1 for r in c.rewards.all() if r.status == "unscratched"),
            "to_verify": c.orders.filter(payment_status=Order.SUBMITTED).count(),
            "loyalty": loyalty,
        })


# ------------------------------------------------------------------ cart + wishlist
def product_json(p):
    return {"id": p.id, "name": p.name, "price": str(p.price), "mrp": str(p.mrp) if p.mrp else None, "size": p.size,
            "flavour": p.flavour, "stock": p.stock, "available": p.available, "image": p.display_image}


def cart_json(customer):
    lines, issues = services.cart_lines(customer)
    items = [{"product": product_json(l["product"]), "quantity": l["quantity"],
              "line_total": str(q2(l["unit_price"] * l["quantity"]))} for l in lines]
    return {"items": items, "count": sum(l["quantity"] for l in lines), "issues": issues,
            "subtotal": str(q2(sum((l["unit_price"] * l["quantity"] for l in lines), Decimal("0"))))}


def _product(pk):
    try:
        return Product.objects.get(pk=int(pk))
    except (Product.DoesNotExist, TypeError, ValueError):
        raise serializers.ValidationError({"detail": "That product doesn't exist."})


class CartView(CustomerAPI):
    def get(self, request):
        return Response(cart_json(request.user))

    def post(self, request):
        """Set the quantity of one product (0 removes it). `add` adds on top of what's there."""
        p = _product(request.data.get("product"))
        try:
            qty = int(request.data.get("quantity", 1))
        except (TypeError, ValueError):
            raise serializers.ValidationError({"quantity": "Quantity must be a number."})
        existing = CartItem.objects.filter(customer=request.user, product=p).first()
        if request.data.get("add") and existing:
            qty += existing.quantity
        if qty <= 0:
            CartItem.objects.filter(customer=request.user, product=p).delete()
        else:
            if not p.available:
                raise serializers.ValidationError({"detail": f"{p.name} is sold out."})
            if qty > p.stock:
                raise serializers.ValidationError({"detail": f"Only {p.stock} of {p.name} left."})
            if qty > 20:
                raise serializers.ValidationError({"detail": "You can order up to 20 of one item at a time."})
            CartItem.objects.update_or_create(customer=request.user, product=p, defaults={"quantity": qty})
        return Response(cart_json(request.user))

    def delete(self, request):
        CartItem.objects.filter(customer=request.user).delete()
        return Response(cart_json(request.user))


def wishlist_json(customer):
    return {"items": [{"product": product_json(w.product), "added_at": w.added_at}
                      for w in customer.wishlist_items.select_related("product")],
            "ids": list(customer.wishlist_items.values_list("product_id", flat=True))}


class WishlistView(CustomerAPI):
    def get(self, request):
        return Response(wishlist_json(request.user))

    def post(self, request):
        p = _product(request.data.get("product"))
        WishlistItem.objects.get_or_create(customer=request.user, product=p)
        if request.data.get("move_to_cart"):
            if p.available:
                CartItem.objects.update_or_create(customer=request.user, product=p, defaults={"quantity": 1})
            WishlistItem.objects.filter(customer=request.user, product=p).delete()
        return Response({"wishlist": wishlist_json(request.user), "cart": cart_json(request.user)})

    def delete(self, request):
        WishlistItem.objects.filter(customer=request.user, product_id=request.query_params.get("product")).delete()
        return Response(wishlist_json(request.user))


# ------------------------------------------------------------------ checkout + orders
class QuoteView(CustomerAPI):
    def post(self, request):
        q = services.build_quote(request.user, request.data.get("coupon_code", ""), request.data.get("reward_id"))
        return Response(services.quote_payload(q))


def seller_json(st):
    return {k: getattr(st, k) for k in ("store_name", "tagline", "address", "phone", "email", "gstin", "hsn_code",
                                         "terms_conditions", "return_policy", "declaration", "signatory", "invoice_footer",
                                         "show_cgst_sgst", "upi_id")}


def order_json(order, with_payment=True):
    data = OrderSerializer(order).data
    data["seller"] = seller_json(StoreSettings.load())
    data["payment"] = services.payment_payload(order) if with_payment and order.status != Order.CANCELLED else None
    return data


class CheckoutView(CustomerAPI):
    def post(self, request):
        name = " ".join(str(request.data.get("name", "")).split())[:150]
        if len(name) < 2:
            raise serializers.ValidationError({"name": "Please enter your name."})
        phone = clean_phone(request.data.get("phone"), required=True)
        address = str(request.data.get("address", "")).strip()
        if len(address) < 10:
            raise serializers.ValidationError({"address": "Please enter your full delivery address with pincode."})
        data = {"name": name, "phone": phone, "address": address[:600], "notes": str(request.data.get("notes", ""))[:300]}
        q = services.build_quote(request.user, request.data.get("coupon_code", ""), request.data.get("reward_id"))
        order = services.create_online_order(request.user, q, data)
        if order.payment_status == Order.PAID_P and order.total <= 0:
            pass  # free order: nothing to pay
        return Response(order_json(order), status=201)


class OrdersView(CustomerAPI):
    def get(self, request):
        services.expire_stale_orders()
        qs = request.user.orders.prefetch_related("items")[:100]
        return Response([order_json(o, with_payment=False) for o in qs])


class OrderDetailView(CustomerAPI):
    def get(self, request, pk):
        services.expire_stale_orders()
        order = _my_order(request, pk)
        return Response(order_json(order))


def _my_order(request, pk):
    try:
        return request.user.orders.prefetch_related("items").get(pk=pk)
    except Order.DoesNotExist:
        from rest_framework.exceptions import NotFound
        raise NotFound("Order not found.")


class SubmitPaymentView(CustomerAPI):
    """Customer scanned the QR, paid, and typed the UPI reference number."""

    def post(self, request, pk):
        order = _my_order(request, pk)
        if order.status == Order.CANCELLED:
            raise serializers.ValidationError({"detail": "This order was cancelled. Please place a new order."})
        if order.payment_status == Order.PAID_P:
            return Response(order_json(order))
        ref = re.sub(r"\s", "", str(request.data.get("upi_ref", ""))).upper()
        if not re.fullmatch(r"[A-Z0-9]{8,30}", ref):
            raise serializers.ValidationError({"upi_ref": "Enter the UPI reference / transaction ID shown in your payment app (8-30 letters or numbers)."})
        if Order.objects.filter(upi_ref=ref).exclude(pk=order.pk).exists():
            raise serializers.ValidationError({"upi_ref": "This reference number was already used for another order."})
        order.upi_ref = ref
        order.payment_status = Order.SUBMITTED
        order.payment_submitted_at = timezone.now()
        order.payment_expires_at = None
        order.save(update_fields=["upi_ref", "payment_status", "payment_submitted_at", "payment_expires_at"])
        if StoreSettings.load().auto_confirm_payments:
            services.confirm_payment(order, by="auto")
            order.refresh_from_db()
        return Response(order_json(order))


class CancelOrderView(CustomerAPI):
    def post(self, request, pk):
        order = _my_order(request, pk)
        if order.payment_status in (Order.PAID_P, Order.SUBMITTED) or order.status != Order.PENDING:
            raise serializers.ValidationError({"detail": "This order can't be cancelled here. Please contact the store."})
        services.cancel_order(order, note="Cancelled by customer")
        return Response(order_json(order, with_payment=False))


# ------------------------------------------------------------------ rewards
def reward_json(r):
    shown = r.revealed
    return {"id": r.id, "status": r.status, "revealed": r.revealed, "created_at": r.created_at, "valid_until": r.valid_until,
            "label": r.label if shown else None, "kind": r.kind if shown else None,
            "min_order": str(r.min_order) if shown else None,
            "order": r.source_order.invoice_no if r.source_order_id else ""}


class RewardsView(CustomerAPI):
    def get(self, request):
        c = request.user
        st = StoreSettings.load()
        paid = c.orders.filter(payment_status=Order.PAID_P).exclude(status=Order.CANCELLED)
        return Response({
            "loyalty": services.loyalty_status(c, st),
            "cards": [reward_json(r) for r in c.rewards.select_related("source_order")],
            "stats": {"orders": c.orders.count(), "paid_orders": paid.count(),
                      "spent": str(paid.aggregate(t=Sum("total"))["t"] or "0.00"),
                      "cart": CartItem.objects.filter(customer=c).aggregate(n=Sum("quantity"))["n"] or 0,
                      "wishlist": c.wishlist_items.count()},
            "recent_paid": [{"invoice_no": o.invoice_no, "total": str(o.total), "at": o.paid_at, "free": o.loyalty_free} for o in paid[:12]],
        })


class ScratchView(CustomerAPI):
    def post(self, request, pk):
        r = request.user.rewards.filter(pk=pk).first()
        if r is None:
            raise serializers.ValidationError({"detail": "Card not found."})
        if not r.revealed:
            r.revealed = True
            r.revealed_at = timezone.now()
            r.save(update_fields=["revealed", "revealed_at"])
        return Response(reward_json(r))


# ------------------------------------------------------------------ public: offers + visit tracking
class OffersView(APIView):
    """Public: the banner (current festival offer, next festivals, free-order rule)."""

    authentication_classes, permission_classes = [], [AllowAny]

    def get(self, request):
        today = timezone.localdate()
        st = StoreSettings.load()
        live = services.live_festival()
        upcoming = Festival.objects.filter(date__gte=today).order_by("date")[:4]
        return Response({
            "live": {"name": live.name, "percent": str(live.discount_percent), "tagline": live.tagline, "ends": live.end_date,
                     "max_discount": str(live.max_discount) if live.max_discount is not None else None,
                     "min_order": str(live.min_order)} if live else None,
            "upcoming": [{"name": f.name, "date": f.date, "offer": f.active and f.discount_percent > 0,
                          "percent": str(f.discount_percent) if f.active and f.discount_percent > 0 else None} for f in upcoming],
            "loyalty": {"enabled": st.loyalty_enabled, "every": st.loyalty_every, "cap": str(st.loyalty_cap)},
            "store": {"name": st.store_name, "tagline": st.tagline},
        })


class TrackView(APIView):
    """Public + throttled: counts a page view (who, where, on what device)."""

    authentication_classes = [OptionalCustomerAuthentication]
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "track"

    def post(self, request):
        vid = str(request.data.get("visitor_id", ""))
        path = str(request.data.get("path", ""))[:200]
        if not re.fullmatch(r"[A-Za-z0-9-]{8,40}", vid) or not path.startswith("/") or path.startswith("/manage"):
            return Response(status=204)
        ua = request.META.get("HTTP_USER_AGENT", "").lower()
        device = "mobile" if any(k in ua for k in ("mobi", "android", "iphone")) else "desktop"
        c = request.user if isinstance(request.user, Customer) else None
        Visit.objects.create(visitor_id=vid, customer=c, path=path, device=device, ip=client_ip(request))
        return Response(status=204)
