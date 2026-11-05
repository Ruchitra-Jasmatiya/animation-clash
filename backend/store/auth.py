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
