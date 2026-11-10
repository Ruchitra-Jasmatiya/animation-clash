from datetime import timedelta

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import SAFE_METHODS, AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from store.audit import audit, log_login
from store.auth import CustomerTokenAuthentication, ExpiringTokenAuthentication
from store.models import LoginAttempt

from .models import Product
from .serializers import ProductSerializer

MAX_FAILS = 5
LOCK_MINUTES = 15


class IsStaff(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.is_staff)


class IsStaffOrReadOnly(BasePermission):
    """The catalogue is for signed-in customers (or staff) to read; only staff can change it."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return IsStaff().has_permission(request, view)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    authentication_classes = [ExpiringTokenAuthentication, CustomerTokenAuthentication]
    permission_classes = [IsStaffOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = None

    def perform_create(self, serializer):
        obj = serializer.save()
        audit(self.request, "create", "product", f"Added product “{obj.name}”")

    def perform_update(self, serializer):
        obj = serializer.save()
        audit(self.request, "update", "product", f"Edited product “{obj.name}”")

    def perform_destroy(self, instance):
        name = instance.name
        if instance.image:
            instance.image.delete(save=False)
        instance.delete()
        audit(self.request, "delete", "product", f"Deleted product “{name}”")


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=256, trim_whitespace=False)


def _is_locked(username):
    since = timezone.now() - timedelta(minutes=LOCK_MINUTES)
    last_ok = LoginAttempt.objects.filter(username__iexact=username, success=True).order_by("-created_at").first()
    if last_ok and last_ok.created_at > since:
        since = last_ok.created_at
    fails = LoginAttempt.objects.filter(username__iexact=username, success=False, blocked=False,
                                        source="manager", created_at__gt=since).count()
    return fails >= MAX_FAILS


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        username, password = s.validated_data["username"], s.validated_data["password"]

        if _is_locked(username):
            log_login(request, username, False, blocked=True)
            return Response({"detail": f"Too many wrong attempts. Try again in {LOCK_MINUTES} minutes."},
                            status=status.HTTP_429_TOO_MANY_REQUESTS)

        user = authenticate(request, username=username, password=password)
        if user is None or not user.is_staff or not user.is_active:
            log_login(request, username, False)
            return Response({"detail": "Wrong username or password."}, status=status.HTTP_400_BAD_REQUEST)

        Token.objects.filter(user=user).delete()  # one live session per person
        token = Token.objects.create(user=user)
        log_login(request, username, True)
        return Response({"token": token.key, "username": user.get_username()})


class MeView(APIView):
    authentication_classes = [ExpiringTokenAuthentication]
    permission_classes = [IsStaff]

    def get(self, request):
        return Response({"username": request.user.get_username()})


class LogoutView(APIView):
    authentication_classes = [ExpiringTokenAuthentication]
    permission_classes = [IsStaff]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        audit(request, "logout", "session", "Signed out")
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
    authentication_classes = [ExpiringTokenAuthentication]
    permission_classes = [IsStaff]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        old = str(request.data.get("current_password", ""))
        new = str(request.data.get("new_password", ""))
        user = request.user
        if not user.check_password(old):
            return Response({"detail": "Your current password is wrong."}, status=400)
        try:
            validate_password(new, user)
        except DjangoValidationError as e:
            return Response({"detail": " ".join(e.messages)}, status=400)
        user.set_password(new)
        user.save()
        Token.objects.filter(user=user).delete()
        token = Token.objects.create(user=user)
        audit(request, "password", "account", "Changed password")
        return Response({"token": token.key})


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "service": "massup-api"})
