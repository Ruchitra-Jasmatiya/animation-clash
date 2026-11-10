from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand

from store.models import Festival, RewardPool

# (name, date, note) - the main day of each festival. Offers are OFF until you switch them on in /manage -> Festivals.
# Dates follow the New Delhi panchang; moon-sighting festivals can move by a day.
FESTIVALS = [
    ("Dhanteras", date(2026, 11, 6), ""), ("Diwali", date(2026, 11, 8), "Lakshmi Puja"),
    ("Bhai Dooj", date(2026, 11, 11), ""), ("Guru Nanak Jayanti", date(2026, 11, 24), ""),
    ("Christmas", date(2026, 12, 25), ""), ("New Year", date(2027, 1, 1), "New Year's Day"),
    ("Makar Sankranti / Pongal", date(2027, 1, 14), ""), ("Republic Day", date(2027, 1, 26), ""),
    ("Maha Shivratri", date(2027, 3, 6), ""), ("Holi", date(2027, 3, 22), "Some calendars say 23 March"),
    ("Eid al-Fitr", date(2027, 3, 10), "Depends on moon sighting"), ("Ram Navami", date(2027, 4, 15), ""),
    ("Akshaya Tritiya", date(2027, 5, 9), ""), ("Eid al-Adha", date(2027, 5, 17), "Depends on moon sighting"),
    ("Independence Day", date(2027, 8, 15), ""), ("Raksha Bandhan", date(2027, 8, 17), ""),
    ("Janmashtami", date(2027, 8, 25), ""), ("Ganesh Chaturthi", date(2027, 9, 4), ""),
    ("Navratri begins", date(2027, 9, 30), ""), ("Dussehra", date(2027, 10, 9), ""),
    ("Karwa Chauth", date(2027, 10, 18), ""), ("Dhanteras ", date(2027, 10, 27), ""),
    ("Diwali ", date(2027, 10, 29), "Lakshmi Puja"), ("Bhai Dooj ", date(2027, 10, 31), ""),
    ("Guru Nanak Jayanti ", date(2027, 11, 14), ""), ("Christmas ", date(2027, 12, 25), ""),
]

PRIZES = [  # label, kind, value, max_discount, min_order, weight
    ("", "flat", 10, None, 0, 40), ("", "flat", 20, None, 199, 25), ("", "flat", 50, None, 499, 10),
    ("", "percent", 4, 100, 0, 20), ("", "percent", 5, 150, 299, 12), ("", "percent", 10, 250, 799, 3),
    ("", "shipping", 0, None, 0, 10),
]


class Command(BaseCommand):
    help = "Add the Indian festival calendar (offers OFF) and the default scratch-card prizes. Safe to run again."

    def handle(self, *args, **opts):
        added = 0
        for name, d, note in FESTIVALS:
            name = name.strip()
            if d < date.today() - timedelta(days=30):
                continue
            _, made = Festival.objects.get_or_create(
                name=name, date=d,
                defaults={"start_date": d - timedelta(days=3), "end_date": d + timedelta(days=1), "note": note,
                          "preset": True, "active": False, "discount_percent": Decimal("10"),
                          "tagline": f"Happy {name}! Celebrate with MASSUP."})
            added += made
        if not RewardPool.objects.exists():
            for label, kind, value, cap, mn, w in PRIZES:
                RewardPool.objects.create(label=label, kind=kind, value=Decimal(value), max_discount=cap, min_order=Decimal(mn), weight=w)
        self.stdout.write(self.style.SUCCESS(f"Festival calendar ready (+{added}); scratch-card prizes: {RewardPool.objects.count()}."))
