from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Department, LecturerTeachingAssignment


User = get_user_model()


class LecturerRegistrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.department = Department.objects.create(
            name="Computer Science",
            faculty="Science",
        )
        self.other_department = Department.objects.create(
            name="Mathematics",
            faculty="Science",
        )
        self.payload = {
            "username": "newlecturer",
            "first_name": "Ada",
            "last_name": "Lovelace",
            "email": "ada@example.com",
            "password": "StrongPassword123!",
            "role": "LECTURER",
            "teaching_assignments": [
                {"department": self.department.pk, "level": "200"},
                {"department": self.other_department.pk, "level": "300"},
            ],
            "terms_accepted": True,
        }

    def test_lecturer_registration_waits_for_admin_approval(self):
        response = self.client.post(
            "/api/accounts/signup/",
            self.payload,
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        lecturer = User.objects.get(username="newlecturer")
        self.assertEqual(lecturer.role, "LECTURER")
        self.assertFalse(lecturer.lecturer_approved)
        self.assertFalse(lecturer.is_active)
        self.assertEqual(lecturer.department, self.department)
        self.assertEqual(
            set(
                lecturer.teaching_assignments.values_list(
                    "department_id",
                    "level",
                )
            ),
            {
                (self.department.pk, "200"),
                (self.other_department.pk, "300"),
            },
        )

    def test_lecturer_registration_requires_teaching_assignments(self):
        payload = {**self.payload, "teaching_assignments": []}

        response = self.client.post(
            "/api/accounts/signup/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("teaching_assignments", response.data)
        self.assertFalse(User.objects.filter(username="newlecturer").exists())

    def test_public_signup_cannot_assign_class_representative_or_admin_role(self):
        payload = {**self.payload, "role": "CLASS_REP"}

        response = self.client.post(
            "/api/accounts/signup/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username="newlecturer").exists())

    def test_only_superuser_can_approve_lecturer_and_directory_hides_pending(self):
        lecturer = User.objects.create_user(
            username="lecturer",
            password="StrongPassword123!",
            role="LECTURER",
            is_active=False,
            lecturer_approved=False,
            department=self.department,
            level="200",
        )
        LecturerTeachingAssignment.objects.create(
            lecturer=lecturer,
            department=self.department,
            level="200",
        )
        student = User.objects.create_user(
            username="student",
            password="StrongPassword123!",
            role="STUDENT",
            department=self.department,
            level="200",
        )

        student_client = APIClient()
        student_client.force_authenticate(student)
        directory = student_client.get("/api/accounts/lecturers/")
        self.assertEqual(directory.status_code, 200)
        self.assertEqual(directory.data, [])

        owner = User.objects.create_superuser(
            username="owner",
            email="owner@example.com",
            password="StrongPassword123!",
        )
        owner_client = APIClient()
        owner_client.force_authenticate(owner)
        pending = owner_client.get("/api/accounts/admin/lecturers/pending/")
        self.assertEqual(pending.status_code, 200)
        self.assertEqual([item["id"] for item in pending.data], [lecturer.pk])

        approved = owner_client.post(
            f"/api/accounts/admin/lecturers/{lecturer.pk}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approved.status_code, 200)
        lecturer.refresh_from_db()
        self.assertTrue(lecturer.lecturer_approved)
        self.assertTrue(lecturer.is_active)

        directory = student_client.get("/api/accounts/lecturers/")
        self.assertEqual(directory.status_code, 200)
        self.assertEqual([item["id"] for item in directory.data], [lecturer.pk])
