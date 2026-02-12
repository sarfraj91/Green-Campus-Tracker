# Users/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('verify-otp/', views.verify_otp, name='verify_otp'),
    path('resend-otp/', views.resend_otp, name='resend_otp'),
    path('login/', views.login_user, name='login_user'),
    path('profile/', views.profile_user, name='profile_user'),
    path('support/', views.support_request, name='support_request'),
    path('reviews/', views.reviews, name='reviews'),
]
