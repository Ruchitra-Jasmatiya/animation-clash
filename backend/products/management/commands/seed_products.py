from decimal import Decimal

from django.core.management.base import BaseCommand

from products.models import Product

# Sample catalogue. Prices are placeholders - edit them in the /manage panel.
SAMPLE = [
    ("MASSUP Pistachio Protein Powder", "1 kg", "1999", "/images/massup-01-jar-hero.jpg",
     "Our signature jar. Creamy pistachio flavour, a smooth texture and an everyday scoop that fits any routine."),
    ("Pistachio Protein Powder - Trial Jar", "500 g", "1099", "/images/massup-06-jar-garden.jpg",
     "A smaller jar to try the flavour before you commit to the big one."),
    ("Pistachio Protein Powder - Value Jar", "2 kg", "3499", "/images/massup-11-jar-bowl.jpg",
     "The family-size jar for people who scoop every single day."),
    ("Pistachio Protein - Scoop Sampler", "6 sachets", "499", "/images/massup-03-powder-scoop.jpg",
     "Single-serve sachets so you can taste MASSUP anywhere, gym bag included."),
    ("Pistachio Shake Starter Bundle", "Jar + shaker", "2299", "/images/massup-04-shake-pour.jpg",
     "Everything for your first creamy pistachio shake in one bundle."),
    ("Orbit Edition Jar", "1 kg", "2199", "/images/massup-07-jar-orbit.jpg",
     "A limited-run jar celebrating pistachios in full flow."),
]


class Command(BaseCommand):
    help = "Add sample products (use --if-empty to only seed an empty catalogue)."

    def add_arguments(self, parser):
        parser.add_argument("--if-empty", action="store_true")

    def handle(self, *args, **opts):
        if opts["if_empty"] and Product.objects.exists():
            self.stdout.write("Catalogue not empty - skipping seed.")
            return
        for name, size, price, image_url, desc in reversed(SAMPLE):
            Product.objects.create(
                name=name, size=size, price=Decimal(price),
                image_url=image_url, description=desc, flavour="Pistachio",
            )
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(SAMPLE)} products."))
