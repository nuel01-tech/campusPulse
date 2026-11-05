from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import AttendancePasskeyGrant, Department
from attendance.models import AttendanceRecord, LectureSession


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
            radius_meters=50,
        )

    def create_grant(self, user=None):
        return AttendancePasskeyGrant.objects.create(
            user=user or self.first_student,
            session_id=self.session.pk,
            expires_at=timezone.now() + timedelta(minutes=5),
        )

    def post_checkin(self, client, grant, **extra):
        payload = {
            "latitude": self.session.latitude,
            "longitude": self.session.longitude,
            "attendance_grant": str(grant.token),
            **extra,
        }
        return client.post(
            f"/api/attendance/sessions/{self.session.pk}/checkin/",
            payload,
            format="json",
        )

    def test_attendance_grant_cannot_be_used_by_another_student(self):
        grant = self.create_grant()
        client = APIClient()
        client.force_authenticate(self.second_student)

        response = self.post_checkin(client, grant)

        self.assertEqual(response.status_code, 403)
        self.assertFalse(AttendanceRecord.objects.filter(session=self.session).exists())
        grant.refresh_from_db()
        self.assertFalse(grant.used)

    def test_checkin_rejects_gps_accuracy_that_exceeds_venue_radius(self):
        grant = self.create_grant()
        client = APIClient()
        client.force_authenticate(self.first_student)

        response = self.post_checkin(client, grant, accuracy=51)

        self.assertEqual(response.status_code, 403)
        self.assertIn("accuracy_meters", response.data)
        self.assertFalse(AttendanceRecord.objects.filter(session=self.session).exists())
        grant.refresh_from_db()
        self.assertFalse(grant.used)

    def test_checkin_accepts_confident_gps_fix_and_consumes_grant(self):
        grant = self.create_grant()
        client = APIClient()
        client.force_authenticate(self.first_student)

        response = self.post_checkin(client, grant, accuracy=10)

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            AttendanceRecord.objects.filter(
                student=self.first_student,
                session=self.session,
            ).exists()
        )
        grant.refresh_from_db()
        self.assertTrue(grant.used)

    def test_active_sessions_report_existing_checkin(self):
        client = APIClient()
        client.force_authenticate(self.first_student)

        response = client.get("/api/attendance/sessions/active/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data[0]["has_checked_in"])

        AttendanceRecord.objects.create(
            student=self.first_student,
            session=self.session,
        )
        response = client.get("/api/attendance/sessions/active/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data[0]["has_checked_in"])

    def test_checkin_rejects_out_of_range_coordinates(self):
        grant = self.create_grant()
        client = APIClient()
        client.force_authenticate(self.first_student)

        response = self.post_checkin(client, grant, latitude=91)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(AttendanceRecord.objects.filter(session=self.session).exists())
        grant.refresh_from_db()
        self.assertFalse(grant.used)
