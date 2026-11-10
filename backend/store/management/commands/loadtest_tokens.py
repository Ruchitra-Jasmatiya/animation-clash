"""Create fake customers and write their login tokens to loadtest/tokens.txt (for stress tests on your own PC only)."""
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.test import RequestFactory

from store.models import Customer
from store.services import start_session


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=200)

    def handle(self, *args, **o):
        if not settings.DEBUG and "loadtest" not in settings.SETTINGS_MODULE:
            self.stderr.write("Refusing to run on a live server."); return
        tokens = []
        for i in range(o["count"]):
            c, _ = Customer.objects.get_or_create(email=f"load{i}@loadtest.invalid", defaults={"name": f"Load User {i}"})
            tokens.append(start_session(RequestFactory().get("/"), c))
        out = Path(settings.BASE_DIR) / "loadtest" / "tokens.txt"
        out.write_text("\n".join(tokens))
        self.stdout.write(f"{len(tokens)} test users ready -> {out}")
