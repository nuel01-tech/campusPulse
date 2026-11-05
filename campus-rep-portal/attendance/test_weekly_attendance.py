from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Department
from .models import WeeklyAttendanceEntry, WeeklyAttendanceRegister


class WeeklyAttendanceRegisterTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.department = Department.objects.create(name="Computer Science", faculty="Science")
        self.rep = get_user_model().objects.create_user(
            username="weekly_rep",
            password="StrongPass123",
            department=self.department,
            level="200",
            role="CLASS_REP",
        )
        self.student_one = get_user_model().objects.create_user(
            username="student_one",
            first_name="Ada",
            last_name="A",
            department=self.department,
            level="200",
            role="STUDENT",
        )
        self.student_two = get_user_model().objects.create_user(
            username="student_two",
            first_name="Bola",
            last_name="B",
            department=self.department,
            level="200",
            role="STUDENT",
        )
        self.client.force_authenticate(user=self.rep)

    def create_week(self, week=1):
        return self.client.post(
            "/api/attendance/weekly-register/",
            {
                "academic_year": "2026/2027",
                "week_number": week,
                "week_start_date": "2026-11-02",
            },
            format="json",
        )

    def test_class_rep_creates_one_week_register_with_class_roster(self):
        response = self.create_week()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["report"]["summary"]["weeks_recorded"], 1)
        self.assertEqual(len(response.data["report"]["students"]), 2)
        self.assertTrue(
            WeeklyAttendanceEntry.objects.filter(
                register_id=response.data["register_id"],
                status="UNMARKED",
            ).count() == 2
        )

    def test_same_week_cannot_be_created_twice(self):
        self.assertEqual(self.create_week().status_code, 201)
        duplicate = self.create_week()
        self.assertEqual(duplicate.status_code, 409)

    def test_present_absent_totals_and_percentage_are_reported(self):
        created = self.create_week()
        register_id = created.data["register_id"]
        response = self.client.patch(
            f"/api/attendance/weekly-register/{register_id}/",
            {
                "entries": [
                    {"student_id": self.student_one.pk, "status": "PRESENT"},
                    {"student_id": self.student_two.pk, "status": "ABSENT"},
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        rows = {row["id"]: row for row in response.data["report"]["students"]}
        self.assertEqual(rows[self.student_one.pk]["present"], 1)
        self.assertEqual(rows[self.student_one.pk]["absent"], 0)
        self.assertEqual(rows[self.student_one.pk]["attendance_percentage"], 100)
        self.assertEqual(rows[self.student_two.pk]["present"], 0)
        self.assertEqual(rows[self.student_two.pk]["absent"], 1)
        self.assertEqual(rows[self.student_two.pk]["attendance_percentage"], 0)

    def test_unmarked_week_is_not_counted_as_absence(self):
        self.create_week()
        report = self.client.get("/api/attendance/weekly-register/?academic_year=2026%2F2027")
        self.assertEqual(report.status_code, 200)
        for student in report.data["students"]:
            self.assertEqual(student["absent"], 0)
            self.assertEqual(student["unmarked"], 1)
            self.assertEqual(student["attendance_percentage"], 0)

    def test_week_number_outside_range_is_rejected(self):
        response = self.client.post(
            "/api/attendance/weekly-register/",
            {
                "academic_year": "2026/2027",
                "week_number": 53,
                "week_start_date": date(2026, 11, 2).isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
