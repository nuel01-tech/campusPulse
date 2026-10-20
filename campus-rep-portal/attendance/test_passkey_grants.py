from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import AttendancePasskeyGrant, Department
from attendance.models import AttendanceRecord, LectureSession
from django.test import TestCase


User = get_user_model()


class AttendancePasskeyGrantTests(TestCase):
    def setUp(self):
        self.department = Department.objects.create(
            name="Passkey Test Department",
            faculty="Faculty of Testing",
        )
        self.first_student = User.objects.create_user(
            username="first-student",
            password="StrongPassword123!",
            role="STUDENT",
            department=self.department,
            level="200",
            registration_completed=True,
        )
        self.second_student = User.objects.create_user(
            username="second-student",
            password="StrongPassword123!",
            role="STUDENT",
            department=self.department,
            level="200",
            registration_completed=True,
        )
        self.session = LectureSession.objects.create(
            department=self.department,
            level="200",
            course_code="PST 201",
            venue_name="Passkey Test Hall",
            latitude=6.83,
            longitude=3.93,
            is_active=True,
        )

    def test_attendance_grant_cannot_be_used_by_another_student(self):
        grant = AttendancePasskeyGrant.objects.create(
            user=self.first_student,
            session_id=self.session.pk,
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        client = APIClient()
        client.force_authenticate(self.second_student)

        response = client.post(
            f"/api/attendance/sessions/{self.session.pk}/checkin/",
            {
                "latitude": self.session.latitude,
                "longitude": self.session.longitude,
                "attendance_grant": str(grant.token),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(AttendanceRecord.objects.filter(session=self.session).exists())
        grant.refresh_from_db()
        self.assertFalse(grant.used)
