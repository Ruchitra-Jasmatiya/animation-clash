from .models import AuditLog, LoginAttempt


def client_ip(request):
    if request is None:
        return ""
    fwd = request.META.get("HTTP_X_FORWARDED_FOR", "")
    ip = fwd.split(",")[0].strip() if fwd else request.META.get("REMOTE_ADDR", "")
    return ip[:64]


def audit(request, action, target="", summary=""):
    user = getattr(request, "user", None)
    name = user.get_username() if user and user.is_authenticated else ""
    AuditLog.objects.create(user=name, action=action[:30], target=str(target)[:60], summary=str(summary)[:300], ip=client_ip(request))


def log_login(request, username, success, source="manager", blocked=False):
    ua = (request.META.get("HTTP_USER_AGENT", "") if request is not None else "")[:300]
    LoginAttempt.objects.create(username=(username or "")[:150], success=success, blocked=blocked,
                                source=source, ip=client_ip(request), user_agent=ua)
