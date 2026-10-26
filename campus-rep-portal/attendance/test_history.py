from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Department
from .models import AttendanceRecord, LectureSession


User = get_user_model()


class StudentHistoryTests(TestCase):
    def setUp(self):
        self.department = Department.objects.create(
            name="Computer Science",
            faculty="Science",
        )
        self.student = User.objects.create_user(
            username="student",
            password="StrongPass123!",
            role="STUDENT",
            department=self.department,
            level="200",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.student)

    def create_session(self, course_code, **kwargs):
        return LectureSession.objects.create(
            department=self.department,
            level="200",
            course_code=course_code,
            venue_name="Lecture Hall",
            latitude=6.8,
            longitude=3.5,
            **kwargs,
        )

    def test_history_includes_only_ended_sessions(self):
        ended = self.create_session("CSC201", has_ended=True)
        self.create_session("CSC202", is_active=True)
        self.create_session("CSC203")
        AttendanceRecord.objects.create(student=self.student, session=ended)

        response = self.client.get("/api/attendance/my-history/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], ended.pk)
        self.assertEqual(response.data[0]["status"], "attended")
