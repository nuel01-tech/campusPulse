import smtplib
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from attendance.models import ClassCode
from .models import Department


User = get_user_model()
SMTP_SETTINGS = {
    "EMAIL_BACKEND": "django.core.mail.backends.locmem.EmailBackend",
    "EMAIL_HOST": "smtp.gmail.com",
    "EMAIL_HOST_USER": "campuspulse@gmail.com",
    "EMAIL_HOST_PASSWORD": "test-app-password",
    "DEFAULT_FROM_EMAIL": "campuspulse@gmail.com",
}


class GmailSmtpPasswordResetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.department = Department.objects.create(
            name="Computer Science",
            faculty="Science",
        )
        self.user = User.objects.create_user(
            username="student",
            email="student@example.com",
            password="StrongPassword123!",
            department=self.department,
            level="200",
        )
        ClassCode.objects.create(
            department=self.department,
            level="200",
            code="AB12CD",
        )
        self.payload = {
            "username": self.user.username,
            "email": self.user.email,
            "class_code": "ab12cd",
        }

    @override_settings(
        DEBUG=False,
        FRONTEND_URL="https://campuspulse.example",
        **SMTP_SETTINGS,
    )
    def test_forgot_password_sends_smtp_email_with_reset_link(self):
        response = self.client.post(
            "/api/accounts/forgot-password/",
            self.payload,
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("reset_url", response.data)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.from_email, "campuspulse@gmail.com")
        self.assertEqual(message.to, [self.user.email])
        self.assertIn(
            "https://campuspulse.example/reset-password/",
            message.body,
        )
        self.assertEqual(message.alternatives[0][1], "text/html")

    @override_settings(
        DEBUG=False,
        **SMTP_SETTINGS,
    )
    @patch("accounts.email.EmailMultiAlternatives.send")
    def test_smtp_failure_returns_explicit_retry_error(self, send_email):
        send_email.side_effect = smtplib.SMTPAuthenticationError(535, b"Denied")
        response = self.client.post(
            "/api/accounts/forgot-password/",
            self.payload,
            format="json",
        )

        self.assertEqual(response.status_code, 503)
        self.assertIn("try again later", response.data["detail"])

    @override_settings(
        DEBUG=False,
        EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend",
        EMAIL_HOST="smtp.gmail.com",
        EMAIL_HOST_USER="",
        EMAIL_HOST_PASSWORD="",
        DEFAULT_FROM_EMAIL="",
    )
    def test_production_without_smtp_credentials_does_not_report_success(self):
        response = self.client.post(
            "/api/accounts/forgot-password/",
            self.payload,
            format="json",
        )

        self.assertEqual(response.status_code, 503)
        self.assertIn("try again later", response.data["detail"])

    @override_settings(
        DEBUG=True,
        FRONTEND_URL="http://localhost:5173",
        EMAIL_HOST_USER="",
        EMAIL_HOST_PASSWORD="",
    )
    def test_local_development_returns_reset_link_if_smtp_is_unconfigured(self):
        response = self.client.post(
            "/api/accounts/forgot-password/",
            self.payload,
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn(
            "http://localhost:5173/reset-password/",
            response.data["reset_url"],
        )

    @override_settings(DEBUG=False)
    def test_invalid_account_details_do_not_send_email(self):
        invalid_payload = {**self.payload, "class_code": "WRONG1"}
        response = self.client.post(
            "/api/accounts/forgot-password/",
            invalid_payload,
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    @override_settings(
        DEBUG=False,
        **SMTP_SETTINGS,
    )
    def test_reset_link_updates_password(self):
        response = self.client.post(
            "/api/accounts/forgot-password/",
            self.payload,
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        email_text = mail.outbox[0].body
        reset_url = next(
            line for line in email_text.splitlines() if "/reset-password/" in line
        )
        uid, token = reset_url.rstrip("/").rsplit("/", 2)[-2:]
        reset = self.client.post(
            "/api/accounts/reset-password/",
            {
                "uid": uid,
                "token": token,
                "new_password": "NewStrongPassword123",
            },
            format="json",
        )

        self.assertEqual(reset.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewStrongPassword123"))
