from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import AdminAuditEvent, PasskeyCredential


User = get_user_model()


class PasskeyAccessTests(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username="student",
            password="StrongPassword123!",
        )
        self.passkey = PasskeyCredential.objects.create(
            user=self.student,
            credential_id=b"credential-id",
            public_key=b"public-key",
            device_name="Student phone",
        )

    def test_student_cannot_create_an_additional_passkey(self):
        client = APIClient()
        client.force_authenticate(self.student)

        response = client.post("/api/accounts/passkeys/register/options/", {})

        self.assertEqual(response.status_code, 409)
        self.assertIn("Only one passkey", response.data["detail"])
        self.assertEqual(PasskeyCredential.objects.filter(user=self.student).count(), 1)

    def test_attendance_passkey_challenge_explains_missing_passkey(self):
        self.passkey.delete()
        client = APIClient()
        client.force_authenticate(self.student)

        response = client.post(
            "/api/accounts/passkeys/auth/options/",
            {"session_id": 1},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertTrue(response.data["no_passkey"])
        self.assertIn("set up a passkey", response.data["detail"].lower())

    def test_student_cannot_remove_passkey_using_previous_endpoint(self):
        client = APIClient()
        client.force_authenticate(self.student)

        response = client.delete("/api/accounts/passkeys/delete-all/")

        self.assertEqual(response.status_code, 404)
        self.assertTrue(PasskeyCredential.objects.filter(pk=self.passkey.pk).exists())

    def test_only_superuser_can_remove_an_account_passkey(self):
        owner = User.objects.create_superuser(
            username="owner",
            email="owner@example.com",
            password="StrongPassword123!",
        )
        student_client = APIClient()
        student_client.force_authenticate(self.student)
        forbidden = student_client.delete(
            f"/api/accounts/admin/users/{self.student.pk}/passkeys/"
        )
        self.assertEqual(forbidden.status_code, 403)
        self.assertTrue(PasskeyCredential.objects.filter(pk=self.passkey.pk).exists())

        owner_client = APIClient()
        owner_client.force_authenticate(owner)
        removed = owner_client.delete(
            f"/api/accounts/admin/users/{self.student.pk}/passkeys/"
        )
        self.assertEqual(removed.status_code, 200)
        self.assertFalse(PasskeyCredential.objects.filter(user=self.student).exists())
        self.assertTrue(
            AdminAuditEvent.objects.filter(action="PASSKEYS_REMOVED").exists()
        )
