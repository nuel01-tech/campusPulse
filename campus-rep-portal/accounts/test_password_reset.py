from unittest.mock import Mock, patch

import requests
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from attendance.models import ClassCode
from .models import Department


User = get_user_model()


class ResendPasswordResetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.department = Department.objects.create(
            name="Computer Science",
            faculty="Science",
        )
        self.user = User.objects.create_user(
            username="student",
            email="student@example.com",
            password="OriginalStrongPass123",
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
        RESEND_API_KEY="re_test_api_key",
        RESEND_FROM_EMAIL="no-reply@example.com",
    )
    @patch("accounts.email.requests.post")
    def test_forgot_password_sends_resend_email_with_reset_link(self, resend_post):
        resend_post.return_value = Mock(status_code=200)
        resend_post.return_value.raise_for_status.return_value = None

        response = self.client.post(
            "/api/accounts/forgot-password/",
            self.payload,
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("reset_url", response.data)
        resend_post.assert_called_once()
        args, kwargs = resend_post.call_args
        self.assertEqual(args[0], "https://api.resend.com/emails")
        self.assertEqual(
            kwargs["headers"]["Authorization"],
            "Bearer re_test_api_key",
        )
        self.assertEqual(kwargs["json"]["from"], "CampusPulse <no-reply@example.com>")
        self.assertEqual(kwargs["json"]["to"], [self.user.email])
        self.assertIn(
            "https://campuspulse.example/reset-password/",
            kwargs["json"]["text"],
        )
        self.assertEqual(kwargs["timeout"], 10)

    @override_settings(
        DEBUG=False,
        RESEND_API_KEY="re_test_api_key",
        RESEND_FROM_EMAIL="no-reply@example.com",
    )
    @patch("accounts.email.requests.post")
    def test_resend_failure_returns_explicit_retry_error(self, resend_post):
        resend_post.return_value = Mock(status_code=401)
        resend_post.return_value.raise_for_status.side_effect = requests.HTTPError(
            "Unauthorized"
        )

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
        RESEND_API_KEY="",
        RESEND_FROM_EMAIL="no-reply@example.com",
    )
    @patch("accounts.email.requests.post")
    def test_local_development_returns_reset_link_if_resend_is_unconfigured(
        self,
        resend_post,
    ):
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
        resend_post.assert_not_called()

    @override_settings(DEBUG=False)
    @patch("accounts.email.requests.post")
    def test_invalid_account_details_do_not_send_email(self, resend_post):
        invalid_payload = {**self.payload, "class_code": "WRONG1"}

        response = self.client.post(
            "/api/accounts/forgot-password/",
            invalid_payload,
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        resend_post.assert_not_called()

    @override_settings(
        DEBUG=False,
        RESEND_API_KEY="re_test_api_key",
        RESEND_FROM_EMAIL="no-reply@example.com",
    )
    @patch("accounts.email.requests.post")
    def test_reset_link_updates_password(self, resend_post):
        resend_post.return_value = Mock(status_code=200)
        resend_post.return_value.raise_for_status.return_value = None

        response = self.client.post(
            "/api/accounts/forgot-password/",
            self.payload,
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        email_text = resend_post.call_args.kwargs["json"]["text"]
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
