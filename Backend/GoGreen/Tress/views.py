import hashlib
import hmac
import json
import logging
import secrets
from datetime import date
from email.utils import parseaddr
from urllib.parse import quote

import requests
from django.conf import settings
from django.core.mail import send_mail
from django.db.models import IntegerField, Sum
from django.db.models.functions import Coalesce
from django.db.utils import OperationalError, ProgrammingError
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from Users.models import User

from .models import TreeDonation

logger = logging.getLogger(__name__)


def _tracking_url(token):
    return f"{settings.FRONTEND_URL}/track/{token}"


def _certificate_url(token):
    return f"{settings.FRONTEND_URL}/certificate/{token}"


def _mapbox_live_map_url(latitude, longitude):
    if latitude is None or longitude is None:
        return None
    if not settings.MAPBOX_ACCESS_TOKEN:
        return None
    return (
        "https://api.mapbox.com/styles/v1/mapbox/streets-v12.html"
        f"?title=false&zoomwheel=true&access_token={quote(settings.MAPBOX_ACCESS_TOKEN)}"
        f"#14/{latitude}/{longitude}"
    )


def _mapbox_search_url(latitude, longitude, location_text):
    live_map = _mapbox_live_map_url(latitude, longitude)
    if live_map:
        return live_map
    if location_text:
        return f"https://www.mapbox.com/search?query={quote(location_text)}"
    return None


def _mapbox_static_map_url(latitude, longitude):
    if latitude is None or longitude is None:
        return None
    if not settings.MAPBOX_ACCESS_TOKEN:
        return None
    return (
        "https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/"
        f"pin-s+0f766e({longitude},{latitude})/{longitude},{latitude},13,0/720x360"
        f"?access_token={settings.MAPBOX_ACCESS_TOKEN}"
    )


def _carbon_offset_kg_per_year(tree_count):
    value = (tree_count or 0) * settings.CARBON_OFFSET_PER_TREE_KG_PER_YEAR
    return round(value, 2)


def _serialize_donation(donation):
    proof_image_1_url = None
    proof_image_2_url = None
    if donation.proof_image_1:
        try:
            proof_image_1_url = donation.proof_image_1.url
        except Exception:
            proof_image_1_url = str(donation.proof_image_1)
    if donation.proof_image_2:
        try:
            proof_image_2_url = donation.proof_image_2.url
        except Exception:
            proof_image_2_url = str(donation.proof_image_2)

    planted_tree_count = donation.trees_planted_count or donation.number_of_trees or 0
    planted_map_url = _mapbox_search_url(
        donation.planted_latitude,
        donation.planted_longitude,
        donation.planted_location,
    )
    planted_map_live_url = _mapbox_live_map_url(
        donation.planted_latitude,
        donation.planted_longitude,
    )
    planted_map_image_url = _mapbox_static_map_url(
        donation.planted_latitude,
        donation.planted_longitude,
    )
    requested_map_url = _mapbox_search_url(
        donation.latitude,
        donation.longitude,
        donation.planting_location,
    )
    requested_map_live_url = _mapbox_live_map_url(
        donation.latitude,
        donation.longitude,
    )
    requested_map_image_url = _mapbox_static_map_url(
        donation.latitude,
        donation.longitude,
    )
    carbon_offset = _carbon_offset_kg_per_year(planted_tree_count)

    return {
        "id": donation.id,
        "full_name": donation.full_name,
        "email": donation.email,
        "phone": donation.phone,
        "number_of_trees": donation.number_of_trees,
        "tree_species": donation.tree_species,
        "planting_location": donation.planting_location,
        "latitude": donation.latitude,
        "longitude": donation.longitude,
        "objective": donation.objective,
        "dedication_name": donation.dedication_name,
        "notes": donation.notes,
        "amount_paise": donation.amount_paise,
        "currency": donation.currency,
        "payment_status": donation.payment_status,
        "approval_status": donation.approval_status,
        "razorpay_order_id": donation.razorpay_order_id,
        "razorpay_payment_id": donation.razorpay_payment_id,
        "created_at": donation.created_at.isoformat() if donation.created_at else None,
        "paid_at": donation.paid_at.isoformat() if donation.paid_at else None,
        "approved_at": donation.approved_at.isoformat() if donation.approved_at else None,
        "planted_location": donation.planted_location,
        "planted_latitude": donation.planted_latitude,
        "planted_longitude": donation.planted_longitude,
        "plantation_date": donation.plantation_date.isoformat()
        if donation.plantation_date
        else None,
        "trees_planted_count": donation.trees_planted_count,
        "plantation_update": donation.plantation_update,
        "thank_you_note": donation.thank_you_note,
        "proof_image_1_url": proof_image_1_url,
        "proof_image_2_url": proof_image_2_url,
        "tracking_token": donation.tracking_token,
        "tracking_url": _tracking_url(donation.tracking_token),
        "certificate_url": _certificate_url(donation.tracking_token),
        "impact": {
            "carbon_offset_kg_per_year": carbon_offset,
            "trees_counted": planted_tree_count,
            "unit": "kg/year",
        },
        "user_order_details": {
            "full_name": donation.full_name,
            "email": donation.email,
            "phone": donation.phone,
            "number_of_trees": donation.number_of_trees,
            "tree_species": donation.tree_species,
            "planting_location": donation.planting_location,
            "latitude": donation.latitude,
            "longitude": donation.longitude,
            "requested_map_url": requested_map_url,
            "requested_map_live_url": requested_map_live_url,
            "requested_map_image_url": requested_map_image_url,
            "objective": donation.objective,
            "dedication_name": donation.dedication_name,
            "notes": donation.notes,
            "created_at": donation.created_at.isoformat() if donation.created_at else None,
            "amount_paise": donation.amount_paise,
            "currency": donation.currency,
        },
        "approval_details": {
            "approval_status": donation.approval_status,
            "approved_at": donation.approved_at.isoformat() if donation.approved_at else None,
            "planted_location": donation.planted_location,
            "planted_latitude": donation.planted_latitude,
            "planted_longitude": donation.planted_longitude,
            "planted_map_url": planted_map_url,
            "planted_map_live_url": planted_map_live_url,
            "planted_map_image_url": planted_map_image_url,
            "plantation_date": donation.plantation_date.isoformat()
            if donation.plantation_date
            else None,
            "trees_planted_count": donation.trees_planted_count,
            "plantation_update": donation.plantation_update,
            "thank_you_note": donation.thank_you_note,
            "proof_image_1_url": proof_image_1_url,
            "proof_image_2_url": proof_image_2_url,
        },
    }


def _serialize_tracking(donation):
    data = _serialize_donation(donation)
    data.pop("email", None)
    data.pop("phone", None)
    if "user_order_details" in data:
        data["user_order_details"].pop("email", None)
        data["user_order_details"].pop("phone", None)
    return data


def _get_verified_user(email):
    normalized_email = (email or "").strip().lower()
    if not normalized_email:
        return None
    return User.objects.filter(email=normalized_email, is_verified=True).first()


def _extract_email_from_request(request, data=None):
    email = (request.GET.get("email") or "").strip().lower()
    if email:
        return email

    if data and isinstance(data, dict):
        email = (data.get("email") or "").strip().lower()
        if email:
            return email

    email = (request.POST.get("email") or "").strip().lower()
    return email


def _parse_json_body(request):
    try:
        return json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return None


def _to_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _admin_email():
    candidate = (
        settings.ADMIN_NOTIFICATION_EMAIL
        or settings.EMAIL_HOST_USER
        or settings.DEFAULT_FROM_EMAIL
    )
    parsed = parseaddr(candidate)[1]
    return parsed or candidate


def _build_admin_message(donation):
    map_link = _mapbox_live_map_url(donation.latitude, donation.longitude) or _mapbox_search_url(
        None,
        None,
        donation.planting_location,
    )
    if not map_link:
        map_link = "-"
    map_image = _mapbox_static_map_url(donation.latitude, donation.longitude) or "-"
    carbon_offset = _carbon_offset_kg_per_year(
        donation.trees_planted_count or donation.number_of_trees
    )

    lines = [
        "A new tree donation has been paid successfully.",
        "",
        f"Donation ID: {donation.id}",
        f"User Name: {donation.full_name}",
        f"User Email: {donation.email}",
        f"User Phone: {donation.phone}",
        f"Trees Ordered: {donation.number_of_trees}",
        f"Tree Species: {donation.tree_species or '-'}",
        f"Objective: {donation.objective}",
        f"Planting Location: {donation.planting_location}",
        f"Latitude: {donation.latitude if donation.latitude is not None else '-'}",
        f"Longitude: {donation.longitude if donation.longitude is not None else '-'}",
        f"Mapbox Link: {map_link}",
        f"Mapbox Static Preview: {map_image}",
        f"Dedication: {donation.dedication_name or '-'}",
        f"Notes: {donation.notes or '-'}",
        f"Amount: {donation.amount_paise / 100:.2f} {donation.currency}",
        f"Razorpay Order ID: {donation.razorpay_order_id}",
        f"Razorpay Payment ID: {donation.razorpay_payment_id or '-'}",
        f"Paid At: {donation.paid_at}",
        f"Estimated Carbon Offset: {carbon_offset} kg/year",
        f"Tracking URL: {_tracking_url(donation.tracking_token)}",
        f"Certificate URL: {_certificate_url(donation.tracking_token)}",
    ]
    return "\n".join(lines)


def _send_admin_notification(donation):
    recipient = _admin_email()
    if not recipient:
        logger.warning("Admin email is not configured. Skipping donation notification.")
        return

    send_mail(
        subject=f"New Tree Donation Paid (#{donation.id})",
        message=_build_admin_message(donation),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient],
        fail_silently=False,
    )


def _validate_payment_config():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        return False
    return True


@csrf_exempt
def payment_config(request):
    if request.method != "GET":
        return JsonResponse({"error": "Invalid request"}, status=400)

    return JsonResponse(
        {
            "razorpay_key_id": settings.RAZORPAY_KEY_ID,
            "tree_price_inr": settings.TREE_PRICE_INR,
            "currency": "INR",
        }
    )


@csrf_exempt
def geocode_locations(request):
    if request.method != "GET":
        return JsonResponse({"error": "Invalid request"}, status=400)

    query = (request.GET.get("q") or "").strip()
    if len(query) < 3:
        return JsonResponse({"results": []})
    country = (request.GET.get("country") or "").strip()

    if not settings.MAPBOX_ACCESS_TOKEN:
        return JsonResponse(
            {"error": "Mapbox token is missing on server"},
            status=503,
        )

    try:
        url = (
            "https://api.mapbox.com/geocoding/v5/mapbox.places/"
            f"{quote(query)}.json"
        )
        params = {
            "access_token": settings.MAPBOX_ACCESS_TOKEN,
            "autocomplete": "true",
            "limit": 5,
            "types": "place,locality,neighborhood,address",
            "language": "en",
        }
        if country:
            params["country"] = country.lower()
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException:
        logger.exception("Mapbox geocoding failed for query=%s", query)
        return JsonResponse({"error": "Unable to fetch locations"}, status=502)

    results = []
    for feature in payload.get("features", []):
        center = feature.get("center") or [None, None]
        results.append(
            {
                "place_name": feature.get("place_name"),
                "latitude": center[1],
                "longitude": center[0],
            }
        )

    return JsonResponse({"results": results})


@csrf_exempt
def create_order(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request"}, status=400)

    if not _validate_payment_config():
        return JsonResponse(
            {"error": "Razorpay credentials are missing on server"},
            status=503,
        )

    data = _parse_json_body(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone") or "").strip()
    number_of_trees = _to_int(data.get("number_of_trees"))
    tree_species = (data.get("tree_species") or "").strip()
    objective = (data.get("objective") or "").strip()
    planting_location = (data.get("planting_location") or "").strip()
    dedication_name = (data.get("dedication_name") or "").strip()
    notes = (data.get("notes") or "").strip()
    latitude = _to_float(data.get("latitude"))
    longitude = _to_float(data.get("longitude"))

    if not all([full_name, email, phone, objective, planting_location]):
        return JsonResponse({"error": "Missing required fields"}, status=400)

    if number_of_trees <= 0:
        return JsonResponse({"error": "Number of trees must be greater than 0"}, status=400)

    user = User.objects.filter(email=email, is_verified=True).first()
    if not user:
        return JsonResponse(
            {"error": "Please login with a verified account to donate trees"},
            status=403,
        )

    amount_paise = number_of_trees * settings.TREE_PRICE_INR * 100
    receipt = f"tree_{timezone.now().strftime('%Y%m%d%H%M%S')}_{secrets.token_hex(3)}"

    try:
        order_response = requests.post(
            "https://api.razorpay.com/v1/orders",
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
            json={
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt,
                "notes": {
                    "email": email,
                    "trees": str(number_of_trees),
                },
            },
            timeout=20,
        )
        payload = order_response.json()
    except requests.RequestException:
        logger.exception("Razorpay order creation failed")
        return JsonResponse({"error": "Unable to start payment"}, status=502)

    if order_response.status_code >= 400:
        error_message = (
            payload.get("error", {}).get("description")
            or payload.get("error", {}).get("reason")
            or "Unable to start payment"
        )
        return JsonResponse({"error": error_message}, status=400)

    order_id = payload.get("id")
    if not order_id:
        return JsonResponse({"error": "Invalid order response from payment gateway"}, status=502)

    donation = TreeDonation.objects.create(
        user=user,
        full_name=full_name,
        email=email,
        phone=phone,
        number_of_trees=number_of_trees,
        tree_species=tree_species,
        planting_location=planting_location,
        latitude=latitude,
        longitude=longitude,
        objective=objective,
        dedication_name=dedication_name,
        notes=notes,
        amount_paise=amount_paise,
        currency="INR",
        payment_status="created",
        razorpay_order_id=order_id,
    )

    return JsonResponse(
        {
            "message": "Order created successfully",
            "order_id": order_id,
            "amount_paise": amount_paise,
            "currency": "INR",
            "razorpay_key_id": settings.RAZORPAY_KEY_ID,
            "donation_id": donation.id,
            "tree_price_inr": settings.TREE_PRICE_INR,
        }
    )


@csrf_exempt
def verify_payment(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request"}, status=400)

    if not _validate_payment_config():
        return JsonResponse(
            {"error": "Razorpay credentials are missing on server"},
            status=503,
        )

    data = _parse_json_body(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    order_id = (data.get("razorpay_order_id") or "").strip()
    payment_id = (data.get("razorpay_payment_id") or "").strip()
    signature = (data.get("razorpay_signature") or "").strip()

    if not order_id or not payment_id or not signature:
        return JsonResponse({"error": "Missing payment verification fields"}, status=400)

    donation = TreeDonation.objects.filter(razorpay_order_id=order_id).first()
    if not donation:
        return JsonResponse({"error": "Donation order not found"}, status=404)

    if donation.payment_status == "paid":
        return JsonResponse(
            {"message": "Payment already verified", "donation_id": donation.id}
        )

    generated_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        f"{order_id}|{payment_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(generated_signature, signature):
        donation.payment_status = "failed"
        donation.save(update_fields=["payment_status"])
        return JsonResponse({"error": "Payment signature verification failed"}, status=400)

    try:
        payment_resp = requests.get(
            f"https://api.razorpay.com/v1/payments/{payment_id}",
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
            timeout=20,
        )
        payment_payload = payment_resp.json()
    except requests.RequestException:
        logger.exception("Razorpay payment validation failed for payment=%s", payment_id)
        return JsonResponse({"error": "Unable to validate payment status"}, status=502)

    if payment_resp.status_code >= 400:
        return JsonResponse({"error": "Payment validation failed"}, status=400)

    status_value = payment_payload.get("status")
    payment_order_id = payment_payload.get("order_id")
    amount = _to_int(payment_payload.get("amount"))

    if payment_order_id != donation.razorpay_order_id or amount != donation.amount_paise:
        donation.payment_status = "failed"
        donation.save(update_fields=["payment_status"])
        return JsonResponse({"error": "Payment details mismatch"}, status=400)

    if status_value not in {"authorized", "captured"}:
        return JsonResponse({"error": "Payment is not completed yet"}, status=400)

    donation.razorpay_payment_id = payment_id
    donation.razorpay_signature = signature
    donation.payment_status = "paid"
    donation.paid_at = timezone.now()
    donation.save(
        update_fields=[
            "razorpay_payment_id",
            "razorpay_signature",
            "payment_status",
            "paid_at",
        ]
    )

    try:
        _send_admin_notification(donation)
    except Exception:
        logger.exception("Failed to send admin donation email for donation=%s", donation.id)

    return JsonResponse(
        {
            "message": "Payment verified successfully",
            "donation_id": donation.id,
        }
    )


@csrf_exempt
def user_orders(request):
    if request.method != "GET":
        return JsonResponse({"error": "Invalid request"}, status=400)

    email = _extract_email_from_request(request)
    user = _get_verified_user(email)
    if not user:
        return JsonResponse({"error": "Verified user not found"}, status=404)

    orders = TreeDonation.objects.filter(user=user, is_user_deleted=False)
    return JsonResponse(
        {
            "orders": [_serialize_donation(order) for order in orders],
            "summary": {
                "total_orders": orders.count(),
                "completed_orders": orders.filter(
                    payment_status="paid", approval_status="approved"
                ).count(),
                "pending_orders": orders.filter(
                    payment_status="paid", approval_status="pending"
                ).count(),
                "rejected_orders": orders.filter(approval_status="rejected").count(),
                "unpaid_orders": orders.exclude(payment_status="paid").count(),
            },
        }
    )


@csrf_exempt
def user_order_detail(request, donation_id):
    data = _parse_json_body(request) if request.method in {"PUT", "PATCH", "DELETE"} else None
    email = _extract_email_from_request(request, data)
    user = _get_verified_user(email)
    if not user:
        return JsonResponse({"error": "Verified user not found"}, status=404)

    donation = TreeDonation.objects.filter(
        id=donation_id, user=user, is_user_deleted=False
    ).first()
    if not donation:
        return JsonResponse({"error": "Order not found"}, status=404)

    if request.method == "GET":
        return JsonResponse({"order": _serialize_donation(donation)})

    if request.method in {"PUT", "PATCH"}:
        if data is None:
            return JsonResponse({"error": "Invalid JSON body"}, status=400)

        full_name = data.get("full_name")
        phone = data.get("phone")
        number_of_trees = data.get("number_of_trees")
        tree_species = data.get("tree_species")
        planting_location = data.get("planting_location")
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        objective = data.get("objective")
        dedication_name = data.get("dedication_name")
        notes = data.get("notes")

        has_updates = False

        if full_name is not None:
            full_name = str(full_name).strip()
            if not full_name:
                return JsonResponse({"error": "Full name cannot be empty"}, status=400)
            donation.full_name = full_name
            has_updates = True

        if phone is not None:
            phone = str(phone).strip()
            if not phone:
                return JsonResponse({"error": "Phone cannot be empty"}, status=400)
            donation.phone = phone
            has_updates = True

        if number_of_trees is not None:
            trees = _to_int(number_of_trees)
            if trees <= 0:
                return JsonResponse(
                    {"error": "Number of trees must be greater than 0"},
                    status=400,
                )
            donation.number_of_trees = trees
            if donation.payment_status != "paid":
                donation.amount_paise = trees * settings.TREE_PRICE_INR * 100
            has_updates = True

        if tree_species is not None:
            donation.tree_species = str(tree_species).strip()
            has_updates = True

        if planting_location is not None:
            planting_location = str(planting_location).strip()
            if not planting_location:
                return JsonResponse(
                    {"error": "Planting location cannot be empty"},
                    status=400,
                )
            donation.planting_location = planting_location
            has_updates = True

        if latitude is not None:
            donation.latitude = _to_float(latitude)
            has_updates = True

        if longitude is not None:
            donation.longitude = _to_float(longitude)
            has_updates = True

        if objective is not None:
            objective = str(objective).strip()
            if not objective:
                return JsonResponse({"error": "Objective cannot be empty"}, status=400)
            donation.objective = objective
            has_updates = True

        if dedication_name is not None:
            donation.dedication_name = str(dedication_name).strip()
            has_updates = True

        if notes is not None:
            donation.notes = str(notes).strip()
            has_updates = True

        if not has_updates:
            return JsonResponse({"error": "No fields provided to update"}, status=400)

        # Re-route paid order to pending review whenever user updates details.
        if donation.payment_status == "paid":
            donation.approval_status = "pending"
            donation.approved_at = None
            donation.planted_location = ""
            donation.planted_latitude = None
            donation.planted_longitude = None
            donation.plantation_date = None
            donation.trees_planted_count = None
            donation.plantation_update = ""
            donation.proof_image_1 = None
            donation.proof_image_2 = None
            donation.thank_you_note = ""

        donation.save()
        return JsonResponse(
            {
                "message": "Order updated successfully",
                "order": _serialize_donation(donation),
            }
        )

    if request.method == "DELETE":
        donation.is_user_deleted = True
        donation.user_deleted_at = timezone.now()
        donation.save(update_fields=["is_user_deleted", "user_deleted_at"])
        return JsonResponse({"message": "Order deleted successfully"})

    return JsonResponse({"error": "Invalid request"}, status=400)


@csrf_exempt
def public_impact(request):
    if request.method != "GET":
        return JsonResponse({"error": "Invalid request"}, status=400)

    try:
        paid_orders = TreeDonation.objects.filter(payment_status="paid")
        approved_orders = paid_orders.filter(approval_status="approved")

        # Public totals should reflect all paid plantation entries in DB.
        trees_total = (
            paid_orders.annotate(
                counted_trees=Coalesce(
                    "trees_planted_count",
                    "number_of_trees",
                    output_field=IntegerField(),
                )
            ).aggregate(total=Coalesce(Sum("counted_trees"), 0))["total"]
            or 0
        )
        approved_trees_total = (
            approved_orders.annotate(
                counted_trees=Coalesce(
                    "trees_planted_count",
                    "number_of_trees",
                    output_field=IntegerField(),
                )
            ).aggregate(total=Coalesce(Sum("counted_trees"), 0))["total"]
            or 0
        )

        active_donors = paid_orders.values("email").distinct().count()
        donors_total = active_donors

        approved_projects = approved_orders.count()
        total_projects = paid_orders.count()
        approval_rate = (
            round((approved_projects / total_projects) * 100, 1) if total_projects else 0
        )

        donation_amount_paise = (
            paid_orders.aggregate(total=Coalesce(Sum("amount_paise"), 0))["total"] or 0
        )
        donations_inr_total = round(donation_amount_paise / 100, 2)

        co2_offset_kg = round(
            trees_total * settings.CARBON_OFFSET_PER_TREE_KG_PER_YEAR,
            2,
        )
        co2_offset_tonnes = round(co2_offset_kg / 1000, 2)

        today = timezone.localdate()
        months = []
        month_totals = {}
        for offset in range(5, -1, -1):
            month = today.month - offset
            year = today.year
            while month <= 0:
                month += 12
                year -= 1
            month_start = date(year, month, 1)
            key = (year, month)
            months.append((month_start, key))
            month_totals[key] = 0

        for order in paid_orders.values(
            "plantation_date",
            "approved_at",
            "paid_at",
            "created_at",
            "trees_planted_count",
            "number_of_trees",
        ):
            planted_on = order["plantation_date"]
            if not planted_on and order["paid_at"]:
                planted_on = order["paid_at"].date()
            if not planted_on and order["approved_at"]:
                planted_on = order["approved_at"].date()
            if not planted_on and order["created_at"]:
                planted_on = order["created_at"].date()
            if not planted_on:
                continue

            key = (planted_on.year, planted_on.month)
            if key not in month_totals:
                continue
            month_totals[key] += int(
                order["trees_planted_count"] or order["number_of_trees"] or 0
            )

        monthly_growth = [
            {"month": month_start.strftime("%b"), "trees": month_totals[key]}
            for month_start, key in months
        ]
        peak_monthly_trees = max((item["trees"] for item in monthly_growth), default=0)
    except (OperationalError, ProgrammingError):
        logger.exception("Public impact query failed. Returning safe fallback metrics.")
        trees_total = 0
        approved_trees_total = 0
        co2_offset_kg = 0
        co2_offset_tonnes = 0
        donations_inr_total = 0
        active_donors = 0
        donors_total = 0
        approved_projects = 0
        total_projects = 0
        approval_rate = 0
        monthly_growth = []
        peak_monthly_trees = 0

    return JsonResponse(
        {
            "metrics": {
                "trees_planted": trees_total,
                "approved_trees_planted": approved_trees_total,
                "co2_offset_tonnes": co2_offset_tonnes,
                "co2_offset_tonnes_per_year": co2_offset_tonnes,
                "co2_offset_kg_per_year": co2_offset_kg,
                "donations_inr_total": donations_inr_total,
                "active_donors": active_donors,
                "global_donors": donors_total,
                "approved_projects": approved_projects,
                "total_projects": total_projects,
                "approval_rate_percent": approval_rate,
            },
            "growth": {
                "monthly_growth": monthly_growth,
                "peak_monthly_trees": peak_monthly_trees,
            },
            "commitment": {
                "operations_share_percent": 10,
                "plantation_share_percent": 90,
                "transparency_percent": 100,
                "monitoring_support": "24/7",
            },
            "benchmarks": {
                "community_survival_rate_percent": 85,
                "industry_survival_rate_percent": 60,
            },
        }
    )


@csrf_exempt
def track_order(request, tracking_token):
    if request.method != "GET":
        return JsonResponse({"error": "Invalid request"}, status=400)

    donation = TreeDonation.objects.filter(tracking_token=tracking_token).first()
    if not donation:
        return JsonResponse({"error": "Tracking record not found"}, status=404)

    return JsonResponse({"order": _serialize_tracking(donation)})
