"""Stress test for MASSUP.   See SEO-SECURITY-GUIDE.md for how to run it.
Each fake visitor: loads offers, product list, adds to bag, wishlist, opens bag/quote, rewards, orders — like a real shopper."""
import itertools
import random
from pathlib import Path

from locust import HttpUser, between, task

TOKENS = Path(__file__).with_name("tokens.txt").read_text().split()
_next = itertools.cycle(TOKENS)


class Shopper(HttpUser):
    wait_time = between(1, 4)

    def on_start(self):
        self.headers = {"Authorization": f"Customer {next(_next)}"}
        self.products = []

    @task(5)
    def browse(self):
        r = self.client.get("/api/products/", headers=self.headers, name="GET products")
        if r.ok:
            data = r.json()
            self.products = [p["id"] for p in (data["results"] if isinstance(data, dict) and "results" in data else data)]

    @task(3)
    def offers(self):
        self.client.get("/api/offers/", name="GET offers (public)")

    @task(3)
    def add_to_bag(self):
        if self.products:
            self.client.post("/api/my/cart/", json={"product": random.choice(self.products), "quantity": 1, "add": True}, headers=self.headers, name="POST cart")

    @task(2)
    def wishlist(self):
        if self.products:
            self.client.post("/api/my/wishlist/", json={"product": random.choice(self.products)}, headers=self.headers, name="POST wishlist")

    @task(2)
    def quote(self):
        self.client.post("/api/my/quote/", json={}, headers=self.headers, name="POST quote")

    @task(2)
    def summary(self):
        self.client.get("/api/my/summary/", headers=self.headers, name="GET summary")

    @task(1)
    def rewards_orders(self):
        self.client.get("/api/my/rewards/", headers=self.headers, name="GET rewards")
        self.client.get("/api/my/orders/", headers=self.headers, name="GET orders")

    @task(2)
    def track(self):
        self.client.post("/api/track/", json={"visitor_id": "v" + str(random.randint(1, 10**9)), "path": "/products"}, name="POST track")
