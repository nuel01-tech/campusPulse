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