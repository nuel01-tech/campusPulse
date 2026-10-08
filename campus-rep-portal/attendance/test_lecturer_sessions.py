from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Department, LecturerTeachingAssignment
from .models import AttendanceRecord, LectureSession


User = get_user_model()


class LecturerSessionTests(TestCase):
    def setUp(self):
        self.department = Department.objects.create(
            name="Computer Science",
            faculty="Science",
        )
        self.other_department = Department.objects.create(
            name="Mathematics",
            faculty="Science",
        )
        self.lecturer = User.objects.create_user(
            username="lecturer",
            password="StrongPassword123!",
            role="LECTURER",
            lecturer_approved=True,
            department=self.department,
            level="200",
        )
        LecturerTeachingAssignment.objects.create(
            lecturer=self.lecturer,
            department=self.department,
            level="200",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.lecturer)
        self.session_payload = {
            "department": self.department.pk,
            "level": "200",
            "course_code": "CSC 201",
            "venue_name": "Lecture Theatre 1",
            "latitude": 6.83,
            "longitude": 3.93,
            "radius_meters": 50,
        }

    def test_lecturer_can_create_start_stop_and_export_owned_session(self):
        created = self.client.post(
            "/api/attendance/sessions/create/",
            self.session_payload,
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        session = LectureSession.objects.get(pk=created.data["id"])
        self.assertEqual(session.created_by, self.lecturer)
        self.assertEqual(session.department, self.department)
        self.assertFalse(session.is_active)

        started = self.client.post(
            f"/api/attendance/sessions/{session.pk}/toggle/",
            {},
            format="json",
        )
        self.assertEqual(started.status_code, 200)
        session.refresh_from_db()
        self.assertTrue(session.is_active)

        exported = self.client.get(
            f"/api/attendance/sessions/{session.pk}/export/"
        )
        self.assertEqual(exported.status_code, 200)
        self.assertIn(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            exported["Content-Type"],
        )

        stopped = self.client.post(
            f"/api/attendance/sessions/{session.pk}/toggle/",
            {},
            format="json",
        )
        self.assertEqual(stopped.status_code, 200)
        session.refresh_from_db()
        self.assertFalse(session.is_active)
        self.assertTrue(session.has_ended)

    def test_lecturer_cannot_create_session_outside_approved_assignments(self):
        payload = {
            **self.session_payload,
            "department": self.other_department.pk,
        }

        response = self.client.post(
            "/api/attendance/sessions/create/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(LectureSession.objects.count(), 0)

    def test_lecturer_cannot_manage_another_lecturers_session(self):
        other_lecturer = User.objects.create_user(
            username="otherlecturer",
            password="StrongPassword123!",
            role="LECTURER",
            lecturer_approved=True,
            department=self.department,
            level="200",
        )
        session = LectureSession.objects.create(
            department=self.department,
            created_by=other_lecturer,
            level="200",
            course_code="CSC 201",
            venue_name="Lecture Theatre 1",
            latitude=6.83,
            longitude=3.93,
        )

        response = self.client.post(
            f"/api/attendance/sessions/{session.pk}/toggle/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertFalse(LectureSession.objects.filter(created_by=self.lecturer).exists())

    def test_checkin_rejects_students_outside_session_class(self):
        student = User.objects.create_user(
            username="student",
            password="StrongPassword123!",
            role="STUDENT",
            registration_completed=True,
            department=self.other_department,
            level="200",
        )
        session = LectureSession.objects.create(
            department=self.department,
            created_by=self.lecturer,
            level="200",
            course_code="CSC 201",
            venue_name="Lecture Theatre 1",
            latitude=6.83,
            longitude=3.93,
            is_active=True,
        )
        client = APIClient()
        client.force_authenticate(student)

        response = client.post(
            f"/api/attendance/sessions/{session.pk}/checkin/",
            {"latitude": 6.83, "longitude": 3.93},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(AttendanceRecord.objects.filter(session=session).exists())
