import json
import logging
import random
from email.utils import parseaddr
from threading import Thread

from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Avg, Count, Q
from django.db.utils import OperationalError, ProgrammingError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import User, UserReview

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


def _serialize_review(review):
    avatar_url = None
    user_id = None
    if review.user:
        user_id = review.user.id
        if review.user.avatar:
            try:
                avatar_url = review.user.avatar.url
            except Exception:
                avatar_url = str(review.user.avatar)

    return {
        "id": review.id,
        "user_id": user_id,
        "full_name": review.full_name or (review.user.full_name if review.user else "Anonymous"),
        "email": review.email,
        "avatar": avatar_url,
        "rating": review.rating,
        "review_text": review.review_text or "",
        "is_public": review.is_public,
        "created_at": review.created_at.isoformat() if review.created_at else None,
        "updated_at": review.updated_at.isoformat() if review.updated_at else None,
    }


def _support_email():
    candidate = (
        settings.SUPPORT_EMAIL
        or settings.ADMIN_NOTIFICATION_EMAIL
        or settings.DEFAULT_FROM_EMAIL
    )
    parsed = parseaddr(candidate)[1]
    return parsed or candidate


def _normalized_whatsapp_number():
    digits = "".join(ch for ch in (settings.SUPPORT_WHATSAPP_NUMBER or "") if ch.isdigit())
    if len(digits) == 10:
        return f"91{digits}"
    return digits


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


@csrf_exempt
def support_request(request):
    if request.method == "GET":
        whatsapp_digits = _normalized_whatsapp_number()
        whatsapp_display = (
            f"+{whatsapp_digits}"
            if whatsapp_digits
            else settings.SUPPORT_WHATSAPP_NUMBER
        )
        return JsonResponse(
            {
                "support_email": _support_email(),
                "whatsapp_number": whatsapp_digits or settings.SUPPORT_WHATSAPP_NUMBER,
                "whatsapp_display": whatsapp_display,
            }
        )

    if request.method == "POST":
        data = _parse_json_body(request)
        if data is None:
            return JsonResponse({"error": "Invalid JSON body"}, status=400)

        full_name = (data.get("full_name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        phone = (data.get("phone") or "").strip()
        subject = (data.get("subject") or "").strip() or "Support request"
        message = (data.get("message") or "").strip()

        if not email:
            return JsonResponse({"error": "Email is required"}, status=400)
        if not message:
            return JsonResponse({"error": "Message is required"}, status=400)

        recipient = _support_email()
        if not recipient:
            return JsonResponse({"error": "Support email is not configured"}, status=503)

        email_body = "\n".join(
            [
                "New support request from dashboard:",
                "",
                f"Name: {full_name or '-'}",
                f"Email: {email}",
                f"Phone: {phone or '-'}",
                f"Subject: {subject}",
                "",
                "Message:",
                message,
            ]
        )

        try:
            send_mail(
                subject=f"[GoGreen Support] {subject}",
                message=email_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                fail_silently=False,
            )
        except Exception:
            logger.exception("Failed to send support email for %s", email)
            return JsonResponse({"error": "Unable to send support request"}, status=502)

        return JsonResponse(
            {"message": "Support request sent. Our team will contact you shortly."}
        )

    return JsonResponse({"error": "Invalid request"}, status=400)


@csrf_exempt
def reviews(request):
    if request.method == "GET":
        try:
            user_email = (request.GET.get("email") or "").strip().lower()

            queryset = (
                UserReview.objects.filter(is_public=True)
                .select_related("user")
                .order_by("-updated_at")
            )
            summary_raw = queryset.aggregate(
                avg=Avg("rating"),
                total=Count("id"),
                r1=Count("id", filter=Q(rating=1)),
                r2=Count("id", filter=Q(rating=2)),
                r3=Count("id", filter=Q(rating=3)),
                r4=Count("id", filter=Q(rating=4)),
                r5=Count("id", filter=Q(rating=5)),
            )

            current_user_review = None
            if user_email:
                review = UserReview.objects.filter(email=user_email).first()
                if review:
                    current_user_review = _serialize_review(review)

            return JsonResponse(
                {
                    "summary": {
                        "average_rating": round(summary_raw["avg"] or 0, 2),
                        "total_reviews": summary_raw["total"] or 0,
                        "rating_breakdown": {
                            "1": summary_raw["r1"] or 0,
                            "2": summary_raw["r2"] or 0,
                            "3": summary_raw["r3"] or 0,
                            "4": summary_raw["r4"] or 0,
                            "5": summary_raw["r5"] or 0,
                        },
                    },
                    "reviews": [_serialize_review(review) for review in queryset],
                    "current_user_review": current_user_review,
                }
            )
        except (OperationalError, ProgrammingError):
            logger.exception("Reviews table/query not ready")
            return JsonResponse(
                {
                    "error": (
                        "Reviews feature is not ready in database. "
                        "Run migrations and restart backend."
                    )
                },
                status=503,
            )

    if request.method == "POST":
        try:
            data = _parse_json_body(request)
            if data is None:
                return JsonResponse({"error": "Invalid JSON body"}, status=400)

            email = (data.get("email") or "").strip().lower()
            full_name = (data.get("full_name") or "").strip()
            review_text = (data.get("review_text") or "").strip()
            rating = data.get("rating")

            if not email:
                return JsonResponse({"error": "Email is required"}, status=400)
            if rating is None:
                return JsonResponse({"error": "Rating is required"}, status=400)

            try:
                rating = int(rating)
            except (TypeError, ValueError):
                return JsonResponse({"error": "Rating must be a number from 1 to 5"}, status=400)

            if rating < 1 or rating > 5:
                return JsonResponse({"error": "Rating must be between 1 and 5"}, status=400)

            user = User.objects.filter(email=email, is_verified=True).first()
            if not user:
                return JsonResponse({"error": "Verified user not found"}, status=404)

            review, created = UserReview.objects.update_or_create(
                email=email,
                defaults={
                    "user": user,
                    "full_name": full_name or user.full_name,
                    "rating": rating,
                    "review_text": review_text,
                    "is_public": True,
                },
            )

            return JsonResponse(
                {
                    "message": "Review submitted successfully"
                    if created
                    else "Review updated successfully",
                    "review": _serialize_review(review),
                }
            )
        except (OperationalError, ProgrammingError):
            logger.exception("Unable to save review due to DB state")
            return JsonResponse(
                {
                    "error": (
                        "Reviews feature is not ready in database. "
                        "Run migrations and restart backend."
                    )
                },
                status=503,
            )

    return JsonResponse({"error": "Invalid request"}, status=400)
