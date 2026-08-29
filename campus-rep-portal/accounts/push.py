import json
from django.conf import settings
from pywebpush import webpush, WebPushException
from django.core.mail import send_mail
from .models import PushSubscription


def send_push_to_user(user, title, body):
    if not user.push_notifications:
        return
    for sub in PushSubscription.objects.filter(user=user):
        try:
            webpush(
                subscription_info={
                    'endpoint': sub.endpoint,
                    'keys': {'p256dh': sub.p256dh, 'auth': sub.auth},
                },
                data=json.dumps({'title': title, 'body': body, 'url': '/notifications'}),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={'sub': 'mailto:admin@campuspulse.com'},
            )
        except WebPushException:
            sub.delete()


def send_email_to_user(user, subject, body):
    if not user.email_notifications or not user.email:
        return
    send_mail(
        subject, body, getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@campuspulse.app'),
        [user.email], fail_silently=True,
    )
