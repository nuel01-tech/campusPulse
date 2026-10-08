import logging
import smtplib

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils.html import escape


logger = logging.getLogger(__name__)


class PasswordResetEmailError(Exception):
    pass


def password_reset_email_is_configured():
    return bool(
        settings.EMAIL_HOST
        and settings.EMAIL_HOST_USER
        and settings.EMAIL_HOST_PASSWORD
        and settings.DEFAULT_FROM_EMAIL
    )


def send_password_reset_email(recipient, reset_url):
    if not password_reset_email_is_configured():
        raise PasswordResetEmailError(
            "Gmail SMTP settings are incomplete. Configure EMAIL_HOST, "
            "EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, and DEFAULT_FROM_EMAIL."
        )

    text_content = (
        "We received a request to reset your CampusPulse password.\n\n"
        f"Reset your password using this link:\n{reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )
    safe_reset_url = escape(reset_url)
    html_content = (
        "<p>We received a request to reset your CampusPulse password.</p>"
        f'<p><a href="{safe_reset_url}">Reset your password</a></p>'
        "<p>If you did not request this, you can ignore this email.</p>"
    )

    try:
        message = EmailMultiAlternatives(
            subject="Reset your CampusPulse password",
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient],
        )
        message.attach_alternative(html_content, "text/html")
        sent_count = message.send(fail_silently=False)
    except (OSError, smtplib.SMTPException) as exc:
        logger.exception("Gmail SMTP password reset email request failed.")
        raise PasswordResetEmailError(
            "Gmail SMTP could not send the password reset email."
        ) from exc

    if sent_count != 1:
        raise PasswordResetEmailError(
            "Gmail SMTP did not send the password reset email."
        )
