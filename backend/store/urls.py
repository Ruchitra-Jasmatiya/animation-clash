from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import admin_views, shop_views as sv, views

router = DefaultRouter()
router.register("orders", views.OrderViewSet, basename="order")
router.register("coupons", views.CouponViewSet, basename="coupon")
router.register("customers", admin_views.CustomerViewSet, basename="customer")
router.register("festivals", admin_views.FestivalViewSet, basename="festival")
router.register("reward-pool", admin_views.RewardPoolViewSet, basename="reward-pool")

urlpatterns = [
    path("coupons/validate/", views.CouponValidateView.as_view()),
    path("site-media/", views.SiteMediaListView.as_view()),
    path("site-media/<slug:slot>/", views.SiteMediaDetailView.as_view()),
    path("settings/", views.SettingsView.as_view()),
    path("dashboard/", views.DashboardView.as_view()),
    path("logs/", views.LogsView.as_view()),
    path("analytics/", admin_views.AnalyticsView.as_view()),

    # ---- website customers ----
    path("offers/", sv.OffersView.as_view()),
    path("track/", sv.TrackView.as_view()),
    path("customer/signup/", sv.SignupView.as_view()),
    path("customer/login/", sv.LoginRequestView.as_view()),
    path("customer/verify/", sv.VerifyView.as_view()),
    path("customer/logout/", sv.LogoutView.as_view()),
    path("customer/me/", sv.MeView.as_view()),
    path("my/summary/", sv.SummaryView.as_view()),
    path("my/cart/", sv.CartView.as_view()),
    path("my/wishlist/", sv.WishlistView.as_view()),
    path("my/quote/", sv.QuoteView.as_view()),
    path("my/checkout/", sv.CheckoutView.as_view()),
    path("my/orders/", sv.OrdersView.as_view()),
    path("my/orders/<int:pk>/", sv.OrderDetailView.as_view()),
    path("my/orders/<int:pk>/submit-payment/", sv.SubmitPaymentView.as_view()),
    path("my/orders/<int:pk>/cancel/", sv.CancelOrderView.as_view()),
    path("my/rewards/", sv.RewardsView.as_view()),
    path("my/rewards/<int:pk>/scratch/", sv.ScratchView.as_view()),
    path("", include(router.urls)),
]
