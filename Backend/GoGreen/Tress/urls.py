from django.urls import path

from . import views

urlpatterns = [
    path("config/", views.payment_config, name="payment_config"),
    path("geocode/", views.geocode_locations, name="geocode_locations"),
    path("create-order/", views.create_order, name="create_tree_order"),
    path("verify-payment/", views.verify_payment, name="verify_tree_payment"),
    path("orders/", views.user_orders, name="user_tree_orders"),
    path("orders/<int:donation_id>/", views.user_order_detail, name="user_tree_order_detail"),
    path("track/<str:tracking_token>/", views.track_order, name="track_tree_order"),
]
