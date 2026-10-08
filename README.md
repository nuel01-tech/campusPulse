# CampusPulse

A campus attendance and department-communication platform built for OOU class representatives and students. GPS-verified check-in, live session management, department/level-filtered announcements, and attendance analytics.

## Tech Stack

- **Backend:** Django + Django REST Framework, JWT auth (djangorestframework-simplejwt)
- **Frontend:** React (Vite) + Tailwind CSS
- **PWA:** Installable, with push notifications

## Features

- GPS-verified attendance check-in (Haversine distance, rep-adjustable radius)
- Live session control for class reps (start/end, one-way lifecycle)
- Department + level-filtered announcements and assignments
- Attendance stats, streaks, and exam eligibility tracking
- Excel export of attendance sheets
- Class rep audit log
- Class code system to restrict signups to verified students
- Push notifications when a session goes live
- Owner workspace for account, department, class-code, session, announcement, document, and audit management

## Owner Workspace

Sign in to the frontend with a Django superuser account to open the owner dashboard at `/admin`. Account access can be deactivated and restored without deleting the account. Department names can be edited without breaking their existing class links, and departments with linked records cannot be deleted. Class codes are scoped to a department and level.

## Setup

### Backend

```bash
cd campus-rep-portal
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```


Then run:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Password reset email (Gmail SMTP)

Use a Gmail account to send password-reset messages; a custom domain is not required. Enable 2-Step Verification on the Google account, create a Google App Password, and use that app password (not the normal Gmail password). Set these values in the backend `.env` file and as secrets/environment variables on the deployed backend:

```dotenv
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-gmail-address@gmail.com
EMAIL_HOST_PASSWORD=your-16-character-google-app-password
DEFAULT_FROM_EMAIL=your-gmail-address@gmail.com
FRONTEND_URL=https://your-frontend-domain
```

Set `EMAIL_HOST_USER` and `DEFAULT_FROM_EMAIL` to the Gmail address used to create the app password. Keep `EMAIL_HOST_PASSWORD` private: add it only to the backend environment on Render, never to frontend variables or source control. The production settings default to Django's SMTP backend; local development continues to show reset links when SMTP credentials are absent.

### Frontend

```bash
cd campus-rep-frontend
npm install
npm run dev
```

## Status

Actively in development and in user testing. Core attendance flow, session management, announcements, and exports are functional. A few pages (rep announcement composer, student history) are placeholders pending backend wiring.

## Built by

CodewithNUEL — Olabisi Onabanjo University

Create a `.env` file in this folder with: