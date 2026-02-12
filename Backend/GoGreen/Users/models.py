import random
from time import timezone
from django.db import models
from datetime import timedelta
import random

# Create your models here.
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from cloudinary.models import CloudinaryField


# 🔹 Avatar size validation
def validate_avatar_size(image):
    if image.size > 10 * 1024 * 1024:
        raise ValidationError("Avatar must be less than 10MB.")


# 🔹 Custom User Manager
class UserManager(BaseUserManager):
    def create_user(self, email, full_name, phone, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        if not full_name:
            raise ValueError("Full name is required")

        email = self.normalize_email(email)
        user = self.model(
            email=email,
            full_name=full_name,
            phone=phone,
            **extra_fields
        )
        user.set_password(password)  # 🔐 hashes password
        user.save(using=self._db)
        return user

    def create_superuser(self, email, full_name, phone, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_verified', True)

        return self.create_user(email, full_name, phone, password, **extra_fields)


# 🔹 Custom User Model
class User(AbstractBaseUser, PermissionsMixin):

    full_name = models.CharField(
        max_length=150,
        blank=False
    )

    email = models.EmailField(
        unique=True
    )

    phone = models.CharField(
        max_length=15,
        validators=[
            RegexValidator(
                regex=r'^\+?1?\d{9,15}$',
                message="Enter a valid phone number."
            )
        ]
    )

    avatar = CloudinaryField(
        'image',
        folder='avatars',
        blank=True,
        null=True,
        
    )

    # 🔐 Authentication fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # 🔥 Important: User validation field
    is_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    otp = models.CharField(max_length=6, blank=True, null=True)
    

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name', 'phone']

    def __str__(self):
        return self.email
    
    def generate_otp(self):
        self.otp = str(random
        .randint(100000, 999999))
        self.otp_expiry = timezone.now() + timedelta(minutes=5)
        self.save()


class UserReview(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="reviews",
        null=True,
        blank=True,
    )
    full_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(unique=True)
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    review_text = models.TextField(max_length=1200, blank=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-created_at"]

    def __str__(self):
        return f"{self.email} ({self.rating}/5)"


