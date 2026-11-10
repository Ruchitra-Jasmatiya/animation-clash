"""Plain, professional e-mails. Sending never breaks the request: if mail fails the customer can ask for another code."""
import logging
from html import escape

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

log = logging.getLogger(__name__)


def _parse_from(value):
    """'MASSUP <a@b.com>' -> ('MASSUP', 'a@b.com')"""
    value = (value or "").strip()
    if "<" in value and value.endswith(">"):
        name, addr = value.rsplit("<", 1)
        return name.strip().strip('"') or "MASSUP", addr[:-1].strip()
    return "MASSUP", value


def _send_brevo(to, subject, text, html):
    """Send through Brevo's HTTPS API (works on hosts that block SMTP ports, like Render's free plan)."""
    import json
    import urllib.request

    name, addr = _parse_from(getattr(settings, "BREVO_SENDER", "") or settings.DEFAULT_FROM_EMAIL)
    body = {"sender": {"name": name, "email": addr}, "to": [{"email": to}], "subject": subject, "textContent": text}
    if html:
        body["htmlContent"] = html
    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email", data=json.dumps(body).encode(), method="POST",
        headers={"api-key": settings.BREVO_API_KEY, "content-type": "application/json", "accept": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as r:  # nosec B310 - fixed https URL
        return 200 <= r.status < 300


def _send(to, subject, text, html=None):
    if getattr(settings, "BREVO_API_KEY", ""):
        try:
            return _send_brevo(to, subject, text, html)
        except Exception as exc:  # pragma: no cover - depends on the network
            detail = getattr(exc, "read", lambda: b"")()
            log.error("Brevo e-mail to %s failed: %s %s", to, exc, detail[:300])
            return False
    try:
        msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [to])
        if html:
            msg.attach_alternative(html, "text/html")
        msg.send(fail_silently=False)
        return True
    except Exception:  # pragma: no cover - depends on the mail server
        log.exception("Could not send e-mail to %s", to)
        return False


def _page(store, heading, body_html):
    return (
        f'<div style="font-family:Arial,Helvetica,sans-serif;background:#f4f7ee;padding:24px">'
        f'<div style="max-width:480px;margin:auto;background:#ffffff;border-radius:14px;padding:28px;color:#1d2716">'
        f'<div style="font-weight:800;letter-spacing:.14em;font-size:13px;color:#4c7a2a">{escape(store)}</div>'
        f'<h2 style="margin:14px 0 8px;font-size:20px">{heading}</h2>{body_html}'
        f'<p style="color:#7a8670;font-size:12px;margin-top:26px">If you did not ask for this, you can ignore this e-mail.</p>'
        f"</div></div>"
    )


def send_otp(email, code, store_name="MASSUP", purpose="login"):
    minutes = settings.OTP_TTL_MINUTES
    what = "create your account" if purpose == "signup" else "sign in"
    text = (f"Your {store_name} verification code is {code}.\n\n"
            f"Use it to {what}. It works for {minutes} minutes. Never share this code with anyone.")
    html = _page(store_name, "Your verification code",
                 f'<p style="margin:0 0 14px">Use this code to {what}:</p>'
                 f'<div style="font-size:34px;font-weight:800;letter-spacing:.3em;background:#eaf3dc;border-radius:12px;'
                 f'padding:14px 0;text-align:center">{code}</div>'
                 f'<p style="color:#5b6650;font-size:14px">It works for {minutes} minutes. Never share this code with anyone.</p>')
    return _send(email, f"{code} is your {store_name} verification code", text, html)


def send_order_paid(order, store_name="MASSUP"):
    if not order.email:
        return False
    text = (f"Hi {order.customer_name},\n\nWe have received your payment for order {order.invoice_no} "
            f"(Rs {order.total}). We are getting it ready.\n\nThank you for shopping with {store_name}.")
    html = _page(store_name, "Payment received",
                 f'<p>Hi {escape(order.customer_name)}, we have received your payment for order <b>{order.invoice_no}</b> '
                 f'(Rs {order.total}). We are getting it ready.</p>'
                 f'<p style="color:#5b6650;font-size:14px">You also have a new scratch card waiting in your Rewards.</p>')
    return _send(order.email, f"Payment received for order {order.invoice_no}", text, html)
