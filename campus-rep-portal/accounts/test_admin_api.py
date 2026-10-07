from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from rest_framework.test import APIClient

from attendance.models import (
    Announcement,
    AttendanceRecord,
    CampusDocument,
    ClassCode,
    LectureSession,
    Notification,
)
from .models import AdminAuditEvent, Department
from .serializers import MyTokenObtainPairSerializer

User = get_user_model()


class OwnerAdminApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.department = Department.objects.create(
            name="Computer Science",
            faculty="Science",
        )
        self.owner = User.objects.create_superuser(
            username="owner",
            email="owner@example.com",
            password="StrongPass123",
        )
        self.student = User.objects.create_user(
            username="student",
            email="student@example.com",
            password="StrongPass123",
            department=self.department,
            level="200",
        )
        self.client.force_authenticate(user=self.owner)

    def test_superuser_token_gets_owner_role_even_when_user_role_is_default(self):
        token = MyTokenObtainPairSerializer.get_token(self.owner)

        self.assertEqual(token["role"], "SUPER_ADMIN")

    def test_admin_apis_reject_non_superusers(self):
        self.client.force_authenticate(user=self.student)

        response = self.client.get("/api/accounts/admin/summary/")

        self.assertEqual(response.status_code, 403)

    def test_owner_can_find_user_and_reversibly_deactivate_and_restore(self):
        listed = self.client.get("/api/accounts/admin/users/", {"search": "student"})
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.data["count"], 1)
        self.assertEqual(listed.data["results"][0]["id"], self.student.pk)

        deactivated = self.client.patch(
            f"/api/accounts/admin/users/{self.student.pk}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(deactivated.status_code, 200)
        self.student.refresh_from_db()
        self.assertFalse(self.student.is_active)
        self.assertTrue(User.objects.filter(pk=self.student.pk).exists())

        restored = self.client.patch(
            f"/api/accounts/admin/users/{self.student.pk}/",
            {"is_active": True},
            format="json",
        )
        self.assertEqual(restored.status_code, 200)
        self.student.refresh_from_db()
        self.assertTrue(self.student.is_active)
        self.assertEqual(AdminAuditEvent.objects.filter(target_type="User").count(), 2)

    def test_owner_account_cannot_be_modified_from_user_manager(self):
        response = self.client.patch(
            f"/api/accounts/admin/users/{self.owner.pk}/",
            {"is_active": False},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.owner.refresh_from_db()
        self.assertTrue(self.owner.is_active)

    def test_profile_endpoint_does_not_permanently_delete_class_records(self):
        self.client.force_authenticate(user=self.student)

        response = self.client.delete("/api/accounts/profile/")

        self.assertEqual(response.status_code, 405)
        self.assertTrue(User.objects.filter(pk=self.student.pk).exists())

    def test_student_class_changes_require_class_code_verification_again(self):
        self.student.registration_completed = True
        self.student.save(update_fields=["registration_completed"])
        other_department = Department.objects.create(
            name="Data Science (weekdays)",
            faculty="Science",
        )

        response = self.client.patch(
            f"/api/accounts/admin/users/{self.student.pk}/",
            {"department": other_department.pk},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("verify the class code again", response.data["detail"])
        self.student.refresh_from_db()
        self.assertEqual(self.student.department, other_department)
        self.assertFalse(self.student.registration_completed)

    def test_department_rename_preserves_linked_users_and_delete_is_blocked(self):
        renamed = self.client.patch(
            f"/api/accounts/admin/departments/{self.department.pk}/",
            {"name": "Computer Science (weekdays)", "faculty": "Science"},
            format="json",
        )
        self.assertEqual(renamed.status_code, 200)
        self.student.refresh_from_db()
        self.assertEqual(self.student.department.name, "Computer Science (weekdays)")

        blocked = self.client.delete(
            f"/api/accounts/admin/departments/{self.department.pk}/"
        )
        self.assertEqual(blocked.status_code, 409)
        self.assertEqual(blocked.data["references"]["users"], 1)
        self.assertTrue(Department.objects.filter(pk=self.department.pk).exists())
        with self.assertRaises(ProtectedError):
            self.department.delete()

    def test_class_code_management_uses_department_and_level(self):
        created = self.client.post(
            "/api/accounts/admin/class-codes/",
            {"department": self.department.pk, "level": "200"},
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        initial_code = created.data["code"]

        with patch("attendance.models.generate_class_code", return_value="NEW123"):
            rotated = self.client.post(
                f"/api/accounts/admin/class-codes/{created.data['id']}/rotate/"
            )
        self.assertEqual(rotated.status_code, 200)
        self.assertEqual(rotated.data["code"], "NEW123")
        self.assertNotEqual(initial_code, rotated.data["code"])

    def test_class_code_remains_valid_after_department_rename(self):
        ClassCode.objects.create(
            department=self.department,
            level="200",
            code="AB12CD",
        )
        renamed = self.client.patch(
            f"/api/accounts/admin/departments/{self.department.pk}/",
            {"name": "Computer Science (weekdays)", "faculty": "Science"},
            format="json",
        )
        self.assertEqual(renamed.status_code, 200)

        self.client.force_authenticate(user=self.student)
        response = self.client.patch(
            "/api/accounts/update-matric/",
            {
                "matric_number": "CSC/2024/001",
                "phone_number": "08012345678",
                "level": "200",
                "class_code": "ab12cd",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.student.refresh_from_db()
        self.assertTrue(self.student.registration_completed)

    def test_ending_session_keeps_attendance_records(self):
        session = LectureSession.objects.create(
            department=self.department,
            level="200",
            course_code="CSC201",
            venue_name="Lecture Hall",
            latitude=6.8,
            longitude=3.5,
            is_active=True,
        )
        AttendanceRecord.objects.create(student=self.student, session=session)

        response = self.client.patch(
            f"/api/accounts/admin/sessions/{session.pk}/",
            {"action": "end"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        session.refresh_from_db()
        self.assertFalse(session.is_active)
        self.assertTrue(session.has_ended)
        self.assertEqual(AttendanceRecord.objects.filter(session=session).count(), 1)

    def test_owner_can_edit_and_delete_announcements(self):
        announcement = Announcement.objects.create(
            department=self.department,
            level="200",
            category="GENERAL",
            title="Old title",
            body="Old body",
            posted_by=self.owner,
        )
        updated = self.client.patch(
            f"/api/accounts/admin/announcements/{announcement.pk}/",
            {"title": "Updated title", "body": "Updated body"},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["title"], "Updated title")

        deleted = self.client.delete(
            f"/api/accounts/admin/announcements/{announcement.pk}/"
        )
        self.assertEqual(deleted.status_code, 200)
        self.assertFalse(Announcement.objects.filter(pk=announcement.pk).exists())

    @patch("accounts.admin_api.send_push_to_user")
    @patch("accounts.admin_api.send_email_to_user")
    def test_owner_can_send_general_announcement_to_selected_class(
        self,
        send_email,
        send_push,
    ):
        other_department = Department.objects.create(
            name="Sociology",
            faculty="Social Science",
        )
        other_class_student = User.objects.create_user(
            username="other_class_student",
            email="other@example.com",
            password="StrongPass123",
            department=other_department,
            level="200",
        )

        response = self.client.post(
            "/api/accounts/admin/announcements/",
            {
                "title": "Class update",
                "body": "Please read this update.",
                "category": "GENERAL",
                "department": self.department.pk,
                "level": "200",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["recipient_count"], 1)
        self.assertEqual(
            Notification.objects.filter(
                user=self.student,
                type="ANNOUNCEMENT",
            ).count(),
            1,
        )
        self.assertFalse(
            Notification.objects.filter(
                user=other_class_student,
                type="ANNOUNCEMENT",
            ).exists()
        )
        send_push.assert_called_once()
        send_email.assert_called_once()
        self.assertTrue(
            AdminAuditEvent.objects.filter(action="ANNOUNCEMENT_SENT").exists()
        )

    @patch("cloudinary_storage.storage.RawMediaCloudinaryStorage.save")
    def test_owner_can_upload_document_to_selected_department_and_level(
        self,
        save_file,
    ):
        save_file.return_value = "campus_documents/class-notes.pdf"
        uploaded_file = SimpleUploadedFile(
            "class-notes.pdf",
            b"%PDF-1.4 test document",
            content_type="application/pdf",
        )

        response = self.client.post(
            "/api/attendance/documents/",
            {
                "title": "Class notes",
                "description": "Shared notes.",
                "course_code": "CSC201",
                "department": str(self.department.pk),
                "level": "200",
                "file": uploaded_file,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201, response.data)
        document = CampusDocument.objects.get(title="Class notes")
        self.assertEqual(document.department, self.department)
        self.assertEqual(document.level, "200")
        self.assertEqual(document.uploaded_by, self.owner)

    def test_owner_can_view_documents_across_classes(self):
        CampusDocument.objects.create(
            title="Class notes",
            description="",
            course_code="CSC201",
            department=self.department,
            level="200",
            file="campus_documents/notes.pdf",
            uploaded_by=self.student,
        )

        listed = self.client.get("/api/attendance/documents/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)
