from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("orders", views.OrderViewSet, basename="order")
router.register("coupons", views.CouponViewSet, basename="coupon")

urlpatterns = [
    path("coupons/validate/", views.CouponValidateView.as_view()),
    path("site-media/", views.SiteMediaListView.as_view()),
    path("site-media/<slug:slot>/", views.SiteMediaDetailView.as_view()),
    path("settings/", views.SettingsView.as_view()),
    path("dashboard/", views.DashboardView.as_view()),
    path("logs/", views.LogsView.as_view()),
    path("", include(router.urls)),
]
