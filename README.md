# Green Campus Tracker

Green Campus Tracker is a full-stack platform to collect tree plantation donations, verify plantation work, and publish transparent impact data.

It is built with:
- Django backend (`Backend/GoGreen`)
- React + Vite frontend (`Frontend`)
- Razorpay for payments
- Mapbox for geocoding and map links
- Cloudinary for avatar and proof images

If you are new to the project, this README is your end-to-end guide.

## Why this project exists

Most climate initiatives fail on transparency. This project is designed to close that gap:
- users can fund plantations,
- admins can approve with proof,
- impact data is visible publicly,
- tracking and certificate links stay shareable.

## Core Features

- Public landing page with strong visual storytelling and live metrics.
- Public impact dashboard with:
- total trees,
- CO2 offset,
- donations,
- active donors,
- monthly growth chart,
- commitment and survival benchmarks.
- Public community reviews section at the end of landing page with:
- star ratings,
- user name,
- avatar (if available),
- review text and date.
- OTP-based registration and verification.
- Login + profile management (including avatar upload).
- Tree donation flow with Razorpay checkout.
- Mapbox location search and coordinate capture.
- User dashboard with:
- order history and order edits,
- order delete (soft delete),
- support via WhatsApp and email,
- submit/update rating and review.
- Admin approval flow with plantation proof details and automatic user email updates.
- Public order tracking page by token.
- Printable donation certificate page by token.

## End-to-End Flow

1. User registers with email/phone/password/avatar.
2. Backend sends OTP by email.
3. User verifies OTP and gets authenticated in frontend local storage (`gogreen_user`).
4. User fills donation form:
- trees count,
- objective,
- Mapbox location (lat/long required),
- optional note/dedication.
5. Backend creates Razorpay order.
6. User completes Razorpay payment.
7. Backend verifies signature/payment status, marks donation as `paid`, notifies admin email.
8. Admin reviews order in Django admin:
- can approve/reject,
- can add plantation date/location, planted count, proof images, thank-you note.
9. On approval, user receives email update with tracking and certificate links.
10. Public pages consume DB-driven metrics and reviews.

## Project Structure

```text
Green Campus Tracker/
├── Backend/
│   └── GoGreen/
│       ├── GoGreen/          # Django settings, root urls
│       ├── Users/            # Auth, profile, support, reviews
│       ├── Tress/            # Donations, payment, impact, tracking
│       ├── db.sqlite3
│       └── manage.py
├── Frontend/
│   ├── src/
│   │   ├── components/pages/                # Login, OTP, Dashboard, Donate, Tracking, Certificate
│   │   └── components/users/landingPage/    # Landing + Impact pages
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Important Credentials and Configuration

Backend reads environment variables from `.env` (recommended at `Backend/GoGreen/.env`).

### Required for normal production-like flow (.env file)

- `DJANGO_SECRET_KEY`
- `DEBUG` (set to `False` in production)
- `ALLOWED_HOSTS` (comma-separated)
- `FRONTEND_URL`
- `DATABASE_URL`
- `SMTP_USER`
- `SMTP_PASS`
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
- `MAPBOX_ACCESS_TOKEN`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### Useful optional settings

- `CORS_ALLOWED_ORIGINS` (comma-separated origins)
- `CSRF_TRUSTED_ORIGINS` (comma-separated origins)
- `SMTP_HOST` (default `smtp.gmail.com`)
- `SMTP_PORT` (default `587`)
- `SMTP_ADMIN` (fallback sender)
- `SECURE_SSL_REDIRECT` (default `True` when `DEBUG=False`)
- `SECURE_HSTS_SECONDS` (default `31536000`)
- `TREE_PRICE_INR` (default `99`)
- `CARBON_OFFSET_PER_TREE_KG_PER_YEAR` (default `21`)
- `ADMIN_NOTIFICATION_EMAIL`
- `FRONTEND_URL` (default `http://localhost:5173`)
- `SUPPORT_WHATSAPP_NUMBER` (default `000000000`)
- `SUPPORT_EMAIL`

### Example `.env`

```env
# Core Django
DJANGO_SECRET_KEY=replace-with-a-long-random-secret
DEBUG=False
ALLOWED_HOSTS=api.example.com

# Frontend origin / CORS / CSRF
FRONTEND_URL=https://app.example.com
CORS_ALLOWED_ORIGINS=https://app.example.com
CSRF_TRUSTED_ORIGINS=https://app.example.com

# Database
DATABASE_URL=postgres://postgres:password@localhost:5432/greencampus

# SMTP / OTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_smtp_password
SMTP_ADMIN=your_email@example.com

# Payment
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx

# Maps
MAPBOX_ACCESS_TOKEN=pk.xxxxxxxxxxxxxxxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# App behavior
TREE_PRICE_INR=99
CARBON_OFFSET_PER_TREE_KG_PER_YEAR=21
ADMIN_NOTIFICATION_EMAIL=admin@example.com
FRONTEND_URL=http://localhost:5173
SUPPORT_WHATSAPP_NUMBER=7061609072
SUPPORT_EMAIL=support@example.com
```

### Frontend environment (`Frontend/.env`)

```env
VITE_API_BASE_URL=https://api.example.com
```

## Local Setup

## 1) Backend Setup (Django)

From project root:

```powershell
cd Backend/GoGreen
python -m venv ..\myEnv
..\myEnv\Scripts\Activate.ps1
pip install django djangorestframework django-cors-headers python-dotenv dj-database-url requests cloudinary django-cloudinary-storage psycopg2-binary
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend will run at: `http://127.0.0.1:8000`

Admin panel: `http://127.0.0.1:8000/admin/`

## 2) Frontend Setup (React + Vite)

Open new terminal:

```powershell
cd Frontend
npm install
npm run dev
```

Frontend will run at: `http://localhost:5173`

## Render Deployment (Recommended Settings)

### Backend (Django)

- `Root Directory`: `Backend/GoGreen`
- `Build Command`: `pip install --upgrade pip && pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
- `Start Command`: `gunicorn GoGreen.wsgi:application`
- `Python Version`: `3.13.4` (already pinned with `Backend/GoGreen/.python-version` and `Backend/GoGreen/runtime.txt`)

Set these environment variables in Render:

- `DJANGO_SECRET_KEY`
- `DEBUG=False`
- `ALLOWED_HOSTS=<your-backend-domain>`
- `FRONTEND_URL=<your-frontend-domain>`
- `CORS_ALLOWED_ORIGINS=<your-frontend-domain>`
- `CSRF_TRUSTED_ORIGINS=<your-frontend-domain>`
- `DATABASE_URL`
- SMTP / Razorpay / Mapbox / Cloudinary variables from `.env.example`

### Frontend (Vite static site)

- `Root Directory`: `Frontend`
- `Build Command`: `npm ci && npm run build`
- `Publish Directory`: `dist`
- Environment variable:
  - `VITE_API_BASE_URL=<your-backend-domain>`

## API Map (Backend)

Base URL: `http://127.0.0.1:8000`

### Users (`/api/users/`)

- `POST /register/` - register user and send OTP.
- `POST /verify-otp/` - verify OTP.
- `POST /resend-otp/` - resend OTP.
- `POST /login/` - login verified user.
- `GET /profile/?email=...` - fetch profile.
- `POST /profile/` - update full name/phone/avatar.
- `GET /support/` - fetch support contact.
- `POST /support/` - submit support request email.
- `GET /reviews/` - list public reviews + summary.
- `POST /reviews/` - create/update user review.

### Trees (`/api/trees/`)

- `GET /config/` - fetch payment config (price, key id).
- `GET /geocode/?q=...&country=IN` - Mapbox suggestions.
- `GET /public-impact/` - global metrics, growth, commitment.
- `POST /create-order/` - create Razorpay order.
- `POST /verify-payment/` - verify payment signature and payment status.
- `GET /orders/?email=...` - user dashboard orders.
- `GET /orders/<id>/?email=...` - order details.
- `PUT /orders/<id>/` - edit order (resets paid orders back to pending review).
- `DELETE /orders/<id>/?email=...` - soft delete order.
- `GET /track/<tracking_token>/` - public tracking payload.

## Frontend Routes

- `/` - public landing page.
- `/impact` - public impact dashboard.
- `/signup` - registration.
- `/verify-otp` - email OTP verification.
- `/login` - login.
- `/donate-trees` - protected donation form.
- `/dashboard` - protected user dashboard.
- `/profile` - protected profile update.
- `/track/:token` - public tracking page.
- `/certificate/:token` - public printable certificate.

## Admin Approval Workflow

1. Login at `/admin`.
2. Open `Tree Donations`.
3. Update donation:
- set `approval_status` to approved/rejected,
- optionally add plantation proof data and images.
4. Save.
5. Approved users automatically get an email with tracking and certificate links.

## Dynamic Data Rules in Landing/Impact

- `Total Trees`, `CO2 Offset`, `Donations`, `Active Donors` are computed from all paid orders in DB.
- CO2 is derived using `CARBON_OFFSET_PER_TREE_KG_PER_YEAR`.
- Monthly growth uses last 6 months from plantation/payment timeline.
- Community reviews section fetches all public reviews from DB and shows avatar/profile where available.

## Important Notes

- Support defaults:
- WhatsApp: `7061609072`
- Email: comes from `SUPPORT_EMAIL` or admin/sender fallback.
- Certificate signature currently displays: `Sarfaraj Alam`.
- Review system depends on migration file `Users/migrations/0003_userreview.py`.

If reviews are not working, run:

```powershell
cd Backend/GoGreen
python manage.py migrate
```

## Troubleshooting

- `Unexpected token '<' ... is not valid JSON`:
- backend returned HTML (usually server error page).
- restart backend and check migrations.

- OTP email not sent:
- verify SMTP vars (`SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN`).

- Payment not opening:
- verify `RAZORPAY_KEY_ID` and internet access to `checkout.razorpay.com`.

- Geocoding not working:
- verify `MAPBOX_ACCESS_TOKEN`.

- Avatar/proof uploads failing:
- verify Cloudinary credentials.

- CORS issues in browser:
- ensure backend is running and frontend uses `http://localhost:5173`.

## Security Reminder

Do not commit real secrets to git. Keep all credentials in `.env` only.

Current codebase is built for practical project delivery and demo velocity. Before production, add stronger auth/session controls, permission checks, and stricter backend validation.

## Final Note

This project is more than payment + forms. It is designed to make climate impact visible, trackable, and trustworthy for every user, every order, and every tree.
