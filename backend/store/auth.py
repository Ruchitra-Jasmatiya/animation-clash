from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed


class ExpiringTokenAuthentication(TokenAuthentication):
    """Staff-only tokens that stop working after TOKEN_TTL_HOURS (default 12)."""

    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        if not user.is_staff:
            raise AuthenticationFailed("Not allowed.")
        if timezone.now() - token.created > timedelta(hours=settings.TOKEN_TTL_HOURS):
            token.delete()
            raise AuthenticationFailed("Session expired. Please sign in again.")
        return user, token


import hashlib  # noqa: E402

from rest_framework.authentication import BaseAuthentication, get_authorization_header  # noqa: E402


def hash_key(raw):
    return hashlib.sha256(raw.encode()).hexdigest()


class CustomerTokenAuthentication(BaseAuthentication):
    """`Authorization: Customer <token>` for website customers. A year long, extended every time it is used."""

    keyword = b"customer"

    def authenticate(self, request):
        auth = get_authorization_header(request).split()
        if not auth or auth[0].lower() != self.keyword:
            return None
        if len(auth) != 2:
            raise AuthenticationFailed("Invalid sign-in token.")
        from .models import CustomerToken  # local import: avoids a circular import at start-up

        try:
            tok = CustomerToken.objects.select_related("customer").get(key_hash=hash_key(auth[1].decode()))
        except (CustomerToken.DoesNotExist, UnicodeError):
            raise AuthenticationFailed("Please sign in again.")
        now = timezone.now()
        if tok.expires_at < now:
            tok.delete()
            raise AuthenticationFailed("Please sign in again.")
        if tok.customer.is_blocked:
            raise AuthenticationFailed("This account has been blocked.")
        if now - tok.last_used_at > timedelta(hours=6):
            tok.last_used_at = now
            tok.expires_at = now + timedelta(days=settings.CUSTOMER_TOKEN_DAYS)
            tok.save(update_fields=["last_used_at", "expires_at"])
        return tok.customer, tok

    def authenticate_header(self, request):
        return "Customer"


class OptionalCustomerAuthentication(CustomerTokenAuthentication):
    """Same, but a missing/old token just means 'anonymous' (used for visit tracking)."""

    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except AuthenticationFailed:
            return None
