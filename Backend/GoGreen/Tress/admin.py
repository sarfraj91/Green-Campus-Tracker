from django.contrib import admin
from django.contrib import messages
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from urllib.parse import quote

from .models import TreeDonation


@admin.register(TreeDonation)
class TreeDonationAdmin(admin.ModelAdmin):
    actions = ("mark_approved", "mark_rejected", "restore_user_deleted")
    list_display = (
        "id",
        "full_name",
        "email",
        "number_of_trees",
        "amount_paise",
        "payment_status",
        "approval_status",
        "is_user_deleted",
        "created_at",
    )
    list_filter = ("payment_status", "approval_status", "is_user_deleted", "created_at")
    search_fields = ("full_name", "email", "phone", "razorpay_order_id")
    readonly_fields = (
        "created_at",
        "paid_at",
        "approved_at",
        "user_deleted_at",
        "tracking_token",
    )
    fieldsets = (
        (
            "Order Basics",
            {
                "fields": (
                    "user",
                    "full_name",
                    "email",
                    "phone",
                    "number_of_trees",
                    "tree_species",
                    "objective",
                    "dedication_name",
                    "notes",
                )
            },
        ),
        (
            "Order Location",
            {
                "fields": (
                    "planting_location",
                    "latitude",
                    "longitude",
                )
            },
        ),
        (
            "Payment",
            {
                "fields": (
                    "payment_status",
                    "amount_paise",
                    "currency",
                    "razorpay_order_id",
                    "razorpay_payment_id",
                    "razorpay_signature",
                    "tracking_token",
                    "paid_at",
                )
            },
        ),
        (
            "Approval & Plantation Details",
            {
                "fields": (
                    "approval_status",
                    "approved_at",
                    "planted_location",
                    "planted_latitude",
                    "planted_longitude",
                    "plantation_date",
                    "trees_planted_count",
                    "plantation_update",
                    "proof_image_1",
                    "proof_image_2",
                    "thank_you_note",
                )
            },
        ),
        (
            "Visibility",
            {
                "fields": (
                    "is_user_deleted",
                    "user_deleted_at",
                    "created_at",
                )
            },
        ),
    )

    @admin.action(description="Mark selected orders as approved")
    def mark_approved(self, request, queryset):
        approved_count = 0
        emailed_count = 0
        failed_emails = 0

        for donation in queryset:
            already_approved = donation.approval_status == "approved"
            donation.approval_status = "approved"
            if not donation.approved_at:
                donation.approved_at = timezone.now()
            if not donation.trees_planted_count:
                donation.trees_planted_count = donation.number_of_trees
            if not donation.planted_location:
                donation.planted_location = donation.planting_location
            if donation.planted_latitude is None and donation.latitude is not None:
                donation.planted_latitude = donation.latitude
            if donation.planted_longitude is None and donation.longitude is not None:
                donation.planted_longitude = donation.longitude
            donation.save()
            approved_count += 1

            if not already_approved:
                try:
                    self._send_approval_email(donation)
                    emailed_count += 1
                except Exception:
                    failed_emails += 1

        if approved_count:
            self.message_user(
                request,
                f"{approved_count} order(s) approved. "
                f"Emails sent: {emailed_count}, failed: {failed_emails}.",
                level=messages.SUCCESS if failed_emails == 0 else messages.WARNING,
            )

    @admin.action(description="Mark selected orders as rejected")
    def mark_rejected(self, request, queryset):
        queryset.update(approval_status="rejected", approved_at=None)

    @admin.action(description="Restore user-deleted orders")
    def restore_user_deleted(self, request, queryset):
        queryset.update(is_user_deleted=False, user_deleted_at=None)

    def _proof_url(self, image_field):
        if not image_field:
            return "-"
        try:
            return image_field.url
        except Exception:
            return str(image_field)

    def _mapbox_search_url(self, latitude, longitude, location_text):
        live_url = self._mapbox_live_map_url(latitude, longitude)
        if live_url:
            return live_url
        if location_text:
            return f"https://www.mapbox.com/search?query={quote(location_text)}"
        return "-"

    def _mapbox_live_map_url(self, latitude, longitude):
        token = getattr(settings, "MAPBOX_ACCESS_TOKEN", "")
        if not token:
            return "-"
        if latitude is None or longitude is None:
            return "-"
        return (
            "https://api.mapbox.com/styles/v1/mapbox/streets-v12.html"
            f"?title=false&zoomwheel=true&access_token={quote(token)}"
            f"#14/{latitude}/{longitude}"
        )

    def _mapbox_static_map_url(self, latitude, longitude):
        token = getattr(settings, "MAPBOX_ACCESS_TOKEN", "")
        if not token:
            return "-"
        if latitude is None or longitude is None:
            return "-"
        return (
            "https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/"
            f"pin-s+0f766e({longitude},{latitude})/{longitude},{latitude},13,0/720x360"
            f"?access_token={token}"
        )

    def _send_approval_email(self, donation):
        if not donation.email:
            return

        frontend_url = (getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")
        tracking_url = (
            f"{frontend_url}/track/{donation.tracking_token}" if frontend_url else "-"
        )
        certificate_url = (
            f"{frontend_url}/certificate/{donation.tracking_token}" if frontend_url else "-"
        )
        trees_counted = donation.trees_planted_count or donation.number_of_trees or 0
        carbon_offset = round(
            trees_counted * getattr(settings, "CARBON_OFFSET_PER_TREE_KG_PER_YEAR", 21),
            2,
        )
        planted_map = self._mapbox_search_url(
            donation.planted_latitude,
            donation.planted_longitude,
            donation.planted_location or donation.planting_location,
        )
        planted_map_live = self._mapbox_live_map_url(
            donation.planted_latitude,
            donation.planted_longitude,
        )
        planted_map_preview = self._mapbox_static_map_url(
            donation.planted_latitude,
            donation.planted_longitude,
        )

        proof_1 = self._proof_url(donation.proof_image_1)
        proof_2 = self._proof_url(donation.proof_image_2)
        message_lines = [
            f"Hi {donation.full_name},",
            "",
            "Your tree plantation order has been approved.",
            f"Order ID: {donation.id}",
            f"Approval Status: {(donation.approval_status or 'pending').upper()}",
            f"Trees Ordered: {donation.number_of_trees}",
            f"Trees Planted Count: {trees_counted}",
            f"Planting Location: {donation.planted_location or donation.planting_location}",
            f"Plantation Date: {donation.plantation_date or '-'}",
            f"Coordinates: {donation.planted_latitude if donation.planted_latitude is not None else '-'}, {donation.planted_longitude if donation.planted_longitude is not None else '-'}",
            f"Mapbox Location: {planted_map}",
            f"Mapbox Live Map: {planted_map_live}",
            f"Mapbox Preview: {planted_map_preview}",
            f"Estimated Carbon Offset: {carbon_offset} kg/year",
            "",
            "Plantation Update:",
            donation.plantation_update or "-",
            "",
            "Proof Image 1:",
            proof_1,
            "Proof Image 2:",
            proof_2,
            "",
            "Thank You Note:",
            donation.thank_you_note or "Thank you for supporting a greener future.",
            "",
            "Track Your Plantation:",
            tracking_url,
            "Download/View Certificate:",
            certificate_url,
            "",
            "Regards,",
            "Green Campus Tracker Team",
        ]

        send_mail(
            subject=f"Your Tree Order #{donation.id} Has Been Approved",
            message="\n".join(message_lines),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[donation.email],
            fail_silently=False,
        )

    def save_model(self, request, obj, form, change):
        previous_status = None
        if change and obj.pk:
            old = TreeDonation.objects.filter(pk=obj.pk).first()
            previous_status = old.approval_status if old else None

        if obj.approval_status == "approved" and not obj.approved_at:
            obj.approved_at = timezone.now()
        if obj.approval_status == "approved":
            if not obj.trees_planted_count:
                obj.trees_planted_count = obj.number_of_trees
            if not obj.planted_location:
                obj.planted_location = obj.planting_location
            if obj.planted_latitude is None and obj.latitude is not None:
                obj.planted_latitude = obj.latitude
            if obj.planted_longitude is None and obj.longitude is not None:
                obj.planted_longitude = obj.longitude
        if obj.approval_status != "approved":
            obj.approved_at = None

        super().save_model(request, obj, form, change)

        status_just_approved = obj.approval_status == "approved" and previous_status != "approved"
        if status_just_approved:
            try:
                self._send_approval_email(obj)
                self.message_user(
                    request,
                    "Approval saved and thank-you email sent to user.",
                    level=messages.SUCCESS,
                )
            except Exception as exc:
                self.message_user(
                    request,
                    f"Order approved, but email sending failed: {exc}",
                    level=messages.WARNING,
                )
