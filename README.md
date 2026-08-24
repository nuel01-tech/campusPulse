
# CampusPulse

A campus attendance and department-communication platform built for OOU class representatives and students. GPS-verified check-in, live session management, department/level-filtered announcements, and attendance analytics.

## Tech Stack
- Backend: Django + Django REST Framework, JWT auth
- Frontend: React (Vite) + Tailwind CSS

## Setup

### Backend
```bash
cd campus-rep-portal
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in this folder:


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
Actively in development. Core attendance flow, session management, announcements, and exports are functional. A few pages (rep announcement composer, student history) are placeholders pending backend wiring.
=======
# campusPulse
a Platform for student Attendance
b3c46149f3bf392eb9699812abdfdf050f787125
