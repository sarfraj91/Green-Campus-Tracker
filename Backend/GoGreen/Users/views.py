import json
import logging
import random
from threading import Thread

from django.conf import settings
from django.core.mail import send_mail
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import User

logger = logging.getLogger(__name__)


def _serialize_user(user):
    avatar_url = None
    if user.avatar:
        try:
            avatar_url = user.avatar.url
        except Exception:
            avatar_url = str(user.avatar)

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "avatar": avatar_url,
        "is_verified": user.is_verified,
    }


def _send_otp_email(email, otp):
    send_mail(
        "Your OTP Code",
        f"Your OTP is {otp}",
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )


def _send_otp_email_async(email, otp):
    def _runner():
        try:
            _send_otp_email(email, otp)
        except Exception:
            logger.exception("Failed to send OTP email for %s", email)

    Thread(target=_runner, daemon=True).start()


def _parse_json_body(request):
    try:
        return json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return None


@csrf_exempt
def register(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request"}, status=400)

    full_name = (request.POST.get("full_name") or "").strip()
    email = (request.POST.get("email") or "").strip().lower()
    phone = (request.POST.get("phone") or "").strip()
    password = request.POST.get("password") or ""
    avatar = request.FILES.get("avatar")

    if not all([full_name, email, phone, password]):
        return JsonResponse({"error": "Missing required fields"}, status=400)

    if User.objects.filter(email=email, is_verified=True).exists():
        return JsonResponse({"error": "Email already exists"}, status=400)

    otp = str(random.randint(100000, 999999))
    user = User.objects.filter(email=email, is_verified=False).first()

    if user:
        user.full_name = full_name
        user.phone = phone
        user.set_password(password)
        user.otp = otp
        if avatar is not None:
            user.avatar = avatar
        user.save()
    else:
        user = User.objects.create_user(
            email=email,
            password=password,
            full_name=full_name,
            phone=phone,
            avatar=avatar,
            otp=otp,
            is_verified=False,
        )

    # Keep registration fast by sending email in background.
    _send_otp_email_async(email, otp)

    return JsonResponse(
        {"message": "Registration successful. OTP sent to email.", "email": email},
        status=201,
    )


@csrf_exempt
def verify_otp(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request"}, status=400)

    data = _parse_json_body(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    email = (data.get("email") or "").strip().lower()
    otp = (data.get("otp") or "").strip()

    if not email or not otp:
        return JsonResponse({"error": "Email and OTP are required"}, status=400)

    user = User.objects.filter(email=email).first()
    if not user:
        return JsonResponse({"error": "User not found"}, status=404)

    if user.is_verified:
        return JsonResponse(
            {"message": "Email already verified", "user": _serialize_user(user)}
        )

    if user.otp != otp:
        return JsonResponse({"error": "Invalid OTP"}, status=400)

    user.is_verified = True
    user.otp = None
    user.save(update_fields=["is_verified", "otp"])

    return JsonResponse(
        {"message": "Email verified successfully", "user": _serialize_user(user)}
    )


@csrf_exempt
def resend_otp(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request"}, status=400)

    data = _parse_json_body(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    email = (data.get("email") or "").strip().lower()
    if not email:
        return JsonResponse({"error": "Email is required"}, status=400)

    user = User.objects.filter(email=email).first()
    if not user:
        return JsonResponse({"error": "User not found"}, status=404)

    if user.is_verified:
        return JsonResponse({"error": "Email is already verified"}, status=400)

    otp = str(random.randint(100000, 999999))
    user.otp = otp
    user.save(update_fields=["otp"])
    _send_otp_email_async(email, otp)

    return JsonResponse({"message": "OTP resent successfully"})


@csrf_exempt
def login_user(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request"}, status=400)

    data = _parse_json_body(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return JsonResponse({"error": "Email and password are required"}, status=400)

    user = User.objects.filter(email=email).first()
    if not user or not user.check_password(password):
        return JsonResponse({"error": "Invalid email or password"}, status=401)

    if not user.is_verified:
        return JsonResponse(
            {"error": "Please verify your email before login"},
            status=403,
        )

    return JsonResponse({"message": "Login successful", "user": _serialize_user(user)})


@csrf_exempt
def profile_user(request):
    if request.method == "GET":
        email = (request.GET.get("email") or "").strip().lower()
        if not email:
            return JsonResponse({"error": "Email is required"}, status=400)

        user = User.objects.filter(email=email).first()
        if not user:
            return JsonResponse({"error": "User not found"}, status=404)

        return JsonResponse({"user": _serialize_user(user)})

    if request.method == "POST":
        email = (request.POST.get("email") or "").strip().lower()
        if not email:
            payload = _parse_json_body(request) or {}
            email = (payload.get("email") or "").strip().lower()

        if not email:
            return JsonResponse({"error": "Email is required"}, status=400)

        user = User.objects.filter(email=email).first()
        if not user:
            return JsonResponse({"error": "User not found"}, status=404)

        full_name = request.POST.get("full_name")
        phone = request.POST.get("phone")
        avatar = request.FILES.get("avatar")

        # Support JSON profile updates (without avatar).
        if full_name is None or phone is None:
            payload = _parse_json_body(request) or {}
            if full_name is None:
                full_name = payload.get("full_name")
            if phone is None:
                phone = payload.get("phone")

        updates = []
        if full_name is not None:
            full_name = full_name.strip()
            if not full_name:
                return JsonResponse({"error": "Full name cannot be empty"}, status=400)
            user.full_name = full_name
            updates.append("full_name")
        if phone is not None:
            phone = phone.strip()
            if not phone:
                return JsonResponse({"error": "Phone cannot be empty"}, status=400)
            user.phone = phone
            updates.append("phone")
        if avatar is not None:
            user.avatar = avatar
            updates.append("avatar")

        if not updates:
            return JsonResponse({"error": "No profile fields provided"}, status=400)

        user.save()
        return JsonResponse({"message": "Profile updated", "user": _serialize_user(user)})

    return JsonResponse({"error": "Invalid request"}, status=400)
