from unittest import mock

from django.core.files.base import ContentFile
from django.test import SimpleTestCase

from config.cloud_storage import CloudinaryStorage


class CloudStorageTests(SimpleTestCase):
    def test_save_url_delete(self):
        st = CloudinaryStorage()
        with mock.patch.dict("os.environ", {"CLOUDINARY_URL": "cloudinary://k:s@democloud"}), \
                mock.patch("cloudinary.uploader.upload", return_value={"public_id": "massup/products/abc"}) as up, \
                mock.patch("cloudinary.uploader.destroy") as de:
            name = st.save("products/jar.JPG", ContentFile(b"x"))
            self.assertEqual(name, "massup/products/abc.jpg")
            self.assertEqual(up.call_args.kwargs["resource_type"], "image")
            self.assertEqual(st.url(name), "https://res.cloudinary.com/democloud/image/upload/massup/products/abc.jpg")
            vname = st.save("site/hero.mp4", ContentFile(b"x"))
            self.assertEqual(up.call_args.kwargs["resource_type"], "video")
            self.assertIn("/video/upload/", st.url(vname))
            st.delete(name)
            de.assert_called_once()
