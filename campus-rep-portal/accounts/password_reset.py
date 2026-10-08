import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from attendance.models import ClassCode
from .email import PasswordResetEmailError, send_password_reset_email
from .models import User


logger = logging.getLogger(__name__)


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        email = (request.data.get("email") or "").strip().lower()
        class_code = (request.data.get("class_code") or "").strip().upper()
        response_data = {
            "detail": "If the account details are valid, a password reset link has been sent."
        }

        user = (
            User.objects.filter(username__iexact=username, email__iexact=email)
            .select_related("department")
            .first()
        )
        if not user or not user.department or not user.level:
            return Response(response_data)

        expected_code = ClassCode.objects.filter(
            department=user.department,
            level=user.level,
        ).first()
        if not expected_code or expected_code.code.upper() != class_code:
            return Response(response_data)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_url = settings.FRONTEND_URL.rstrip("/")
        reset_url = f"{frontend_url}/reset-password/{uid}/{token}"

        if settings.DEBUG and not settings.RESEND_API_KEY:
            response_data["reset_url"] = reset_url
            return Response(response_data)

        try:
            send_password_reset_email(user.email, reset_url)
        except PasswordResetEmailError:
            logger.exception("Unable to send password reset email.")
            return Response(
                {
                    "detail": (
                        "Password reset email is temporarily unavailable. "
                        "Please try again later."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(response_data)
