"""URL configuration for the MASSUP backend."""
from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.views.static import serve


def root(_request):
    return JsonResponse({"service": "massup-api", "status": "ok"})


urlpatterns = [
    path("", root),
    path("admin/", admin.site.urls),
    path("api/", include("products.urls")),
    path("api/", include("store.urls")),
    # Uploaded images/videos. Fine for a small shop; see README for persistent storage on Render.
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]
