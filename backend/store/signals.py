from django.contrib.auth.signals import user_logged_in, user_login_failed
from django.dispatch import receiver

from .audit import log_login


def _is_django_admin(request):
    return request is not None and request.path.startswith("/admin")


@receiver(user_logged_in)
def on_login(sender, request, user, **kwargs):
    if _is_django_admin(request):
        log_login(request, user.get_username(), True, source="django-admin")


@receiver(user_login_failed)
def on_login_failed(sender, credentials, request=None, **kwargs):
    if _is_django_admin(request):
        log_login(request, credentials.get("username", ""), False, source="django-admin")
