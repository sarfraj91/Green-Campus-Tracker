from django.contrib import admin

# Register your models here.

from .models import User, UserReview


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "full_name", "email", "phone", "is_verified", "created_at")
    search_fields = ("full_name", "email", "phone")
    list_filter = ("is_verified", "is_staff", "is_active")


@admin.register(UserReview)
class UserReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "full_name", "email", "rating", "is_public", "updated_at")
    search_fields = ("full_name", "email", "review_text")
    list_filter = ("rating", "is_public")

