"""Make a backup file of everything (products, orders, customers, settings).

Run:   python manage.py backup_data            -> writes backups/massup-YYYYmmdd-HHMM.json.gz
Restore (into an empty database):  python manage.py loaddata backups/<file>.json.gz
Customer login tokens and OTP codes are NOT included on purpose.
"""
import gzip
import json
from datetime import datetime
from io import StringIO
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand

EXCLUDE = ["contenttypes", "auth.permission", "sessions", "admin.logentry", "store.customertoken", "store.otpcode", "authtoken"]


class Command(BaseCommand):
    help = "Write a compressed JSON backup of all shop data."

    def add_arguments(self, parser):
        parser.add_argument("--keep", type=int, default=14, help="how many recent backups to keep")

    def handle(self, *args, **opts):
        out = StringIO()
        call_command("dumpdata", natural_foreign=True, natural_primary=True, exclude=EXCLUDE, stdout=out)
        folder = Path(settings.BASE_DIR) / "backups"
        folder.mkdir(exist_ok=True)
        path = folder / f"massup-{datetime.now():%Y%m%d-%H%M}.json.gz"
        with gzip.open(path, "wt", encoding="utf-8") as f:
            f.write(out.getvalue())
        rows = len(json.loads(out.getvalue()))
        for old in sorted(folder.glob("massup-*.json.gz"))[:-opts["keep"]]:
            old.unlink()
        self.stdout.write(self.style.SUCCESS(f"Backup saved: {path} ({rows} records)"))
