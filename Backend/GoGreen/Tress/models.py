from django.conf import settings
from django.db import models
from cloudinary.models import CloudinaryField
import uuid


class TreeDonation(models.Model):
    PAYMENT_STATUS_CHOICES = (
        ("created", "Created"),
        ("paid", "Paid"),
        ("failed", "Failed"),
    )
    APPROVAL_STATUS_CHOICES = (
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="tree_donations",
        null=True,
        blank=True,
    )

    full_name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=20)

    number_of_trees = models.PositiveIntegerField()
    tree_species = models.CharField(max_length=100, blank=True)
    planting_location = models.CharField(max_length=255)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    objective = models.CharField(max_length=255)
    dedication_name = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    amount_paise = models.PositiveIntegerField()
    currency = models.CharField(max_length=10, default="INR")
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default="created"
    )
    approval_status = models.CharField(
        max_length=20, choices=APPROVAL_STATUS_CHOICES, default="pending"
    )

    razorpay_order_id = models.CharField(max_length=100, unique=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)
    tracking_token = models.CharField(
        max_length=40,
        default=uuid.uuid4,
        editable=False,
        db_index=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    is_user_deleted = models.BooleanField(default=False)
    user_deleted_at = models.DateTimeField(null=True, blank=True)

    # Admin plantation proof details
    planted_location = models.CharField(max_length=255, blank=True)
    planted_latitude = models.FloatField(null=True, blank=True)
    planted_longitude = models.FloatField(null=True, blank=True)
    plantation_date = models.DateField(null=True, blank=True)
    trees_planted_count = models.PositiveIntegerField(null=True, blank=True)
    plantation_update = models.TextField(blank=True)
    proof_image_1 = CloudinaryField(
        "image",
        folder="tree_proofs",
        blank=True,
        null=True,
    )
    proof_image_2 = CloudinaryField(
        "image",
        folder="tree_proofs",
        blank=True,
        null=True,
    )
    thank_you_note = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} - {self.number_of_trees} trees ({self.payment_status})"
