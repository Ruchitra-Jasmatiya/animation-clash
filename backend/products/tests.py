import io

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase
import shutil
import tempfile

TMP_MEDIA = tempfile.mkdtemp()


def png_file(name="a.png"):
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), (120, 160, 90)).save(buf, "PNG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/png")


@override_settings(MEDIA_ROOT=TMP_MEDIA)
class ProductApiTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TMP_MEDIA, ignore_errors=True)

    def setUp(self):
        cache.clear()
        U = get_user_model()
        self.staff = U.objects.create_user("boss", password="pw-12345-x", is_staff=True)
        self.user = U.objects.create_user("cust", password="pw-12345-x")

    def login(self):
        r = self.client.post("/api/auth/login/", {"username": "boss", "password": "pw-12345-x"})
        self.assertEqual(r.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + r.data["token"])

    def test_anonymous_cannot_read_or_write(self):
        self.assertEqual(self.client.get("/api/products/").status_code, 401)
        r = self.client.post("/api/products/", {"name": "x", "price": "1", "image_url": "https://e.com/a.jpg"})
        self.assertEqual(r.status_code, 401)

    def test_non_staff_cannot_login(self):
        r = self.client.post("/api/auth/login/", {"username": "cust", "password": "pw-12345-x"})
        self.assertEqual(r.status_code, 400)

    def test_create_with_url_rename_delete(self):
        self.login()
        r = self.client.post("/api/products/", {"name": " Jar  One ", "price": "10.50", "image_url": "https://e.com/a.jpg"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["name"], "Jar One")
        self.assertEqual(r.data["image_display"], "https://e.com/a.jpg")
        pid = r.data["id"]
        r = self.client.patch(f"/api/products/{pid}/", {"name": "Renamed"}, format="json")
        self.assertEqual(r.data["name"], "Renamed")
        self.assertEqual(self.client.delete(f"/api/products/{pid}/").status_code, 204)
        self.assertEqual(self.client.get("/api/products/").data, [])

    def test_upload_from_device_and_replace(self):
        self.login()
        r = self.client.post("/api/products/", {"name": "Up", "price": "5", "image": png_file()}, format="multipart")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(r.data["image_display"].startswith("/media/products/"))
        pid = r.data["id"]
        r = self.client.patch(f"/api/products/{pid}/", {"image_url": "https://e.com/z.jpg"}, format="json")
        self.assertEqual(r.data["image_display"], "https://e.com/z.jpg")

    def test_requires_an_image(self):
        self.login()
        r = self.client.post("/api/products/", {"name": "N", "price": "1"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_rejects_bad_urls_prices_and_files(self):
        self.login()
        for url in ["javascript:alert(1)", "//evil.com/x.png", "ftp://x/y.png"]:
            r = self.client.post("/api/products/", {"name": "N", "price": "1", "image_url": url}, format="json")
            self.assertEqual(r.status_code, 400, url)
        r = self.client.post("/api/products/", {"name": "N", "price": "-3", "image_url": "https://e.com/a.jpg"}, format="json")
        self.assertEqual(r.status_code, 400)
        bad = SimpleUploadedFile("x.svg", b"<svg onload=alert(1)/>", content_type="image/svg+xml")
        r = self.client.post("/api/products/", {"name": "N", "price": "1", "image": bad}, format="multipart")
        self.assertEqual(r.status_code, 400)
