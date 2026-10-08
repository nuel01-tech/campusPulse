import logging

import requests
from django.conf import settings
from django.utils.html import escape


logger = logging.getLogger(__name__)


class PasswordResetEmailError(Exception):
    pass


def send_password_reset_email(recipient, reset_url):
    api_key = settings.RESEND_API_KEY
    sender = settings.RESEND_FROM_EMAIL
    if not api_key:
        raise PasswordResetEmailError("RESEND_API_KEY is not configured.")
    if not sender:
        raise PasswordResetEmailError("RESEND_FROM_EMAIL is not configured.")

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
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": f"CampusPulse <{sender}>",
                "to": [recipient],
                "subject": "Reset your CampusPulse password",
                "text": text_content,
                "html": html_content,
            },
            timeout=10,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.exception("Resend password reset email request failed.")
        raise PasswordResetEmailError("Resend could not send the password reset email.") from exc
