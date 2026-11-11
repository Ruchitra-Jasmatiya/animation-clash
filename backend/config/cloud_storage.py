"""Permanent storage for admin uploads (product pictures, hero videos) on Cloudinary.

Render's disk is wiped on every restart, so uploads must live elsewhere. When the CLOUDINARY_URL
environment variable is set, Django saves every uploaded file to Cloudinary and keeps only a short
name in the database. Without it, files go to the local `media` folder as before (fine for your PC).
"""
import os
import secrets

import cloudinary
import cloudinary.uploader
from django.conf import settings
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible

VIDEO_EXT = {"mp4", "webm", "mov", "m4v", "ogv"}


def _kind(name):
    return "video" if name.rsplit(".", 1)[-1].lower() in VIDEO_EXT else "image"


@deconstructible
class CloudinaryStorage(Storage):
    def _configure(self):
        url = os.environ.get("CLOUDINARY_URL", "")
        if url:
            from urllib.parse import urlparse
            u = urlparse(url)
            cloudinary.config(cloud_name=u.hostname, api_key=u.username, api_secret=u.password, secure=True)

    def _save(self, name, content):
        self._configure()
        base, _, ext = name.rpartition(".")
        folder = "massup/" + base.rsplit("/", 1)[0] if "/" in base else "massup"
        public_id = f"{secrets.token_hex(8)}"
        content.seek(0)
        res = cloudinary.uploader.upload(
            content, resource_type=_kind(name), folder=folder, public_id=public_id, overwrite=False, use_filename=False)
        # store: <public_id incl. folder>.<ext>  e.g. massup/products/ab12cd34ef56ab78.jpg
        return f"{res['public_id']}.{ext.lower()}"

    def _open(self, name, mode="rb"):  # pragma: no cover - files are served straight from Cloudinary
        raise NotImplementedError("Files are served from Cloudinary.")

    def exists(self, name):
        return False  # names are random, never clash

    def url(self, name):
        self._configure()
        cloud = cloudinary.config().cloud_name
        return f"https://res.cloudinary.com/{cloud}/{_kind(name)}/upload/{name}"

    def delete(self, name):
        self._configure()
        public_id = name.rsplit(".", 1)[0]
        try:
            cloudinary.uploader.destroy(public_id, resource_type=_kind(name), invalidate=True)
        except Exception:  # pragma: no cover
            pass

    def size(self, name):  # pragma: no cover
        return 0
