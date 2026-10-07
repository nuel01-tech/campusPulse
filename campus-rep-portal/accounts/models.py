import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser


class Department(models.Model):
    name = models.CharField(max_length=100)
    faculty = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class User(AbstractUser):
    ROLES = (
        ('STUDENT', 'Student'),
        ('CLASS_REP', 'Class Representative'),
        ('SUPER_ADMIN', 'Super Administrator'),
    )
    LEVELS = (
        ('100', '100 Level'),
        ('200', '200 Level'),
        ('300', '300 Level'),
        ('400', '400 Level'),
        ('500', '500 Level'),
    )
    role = models.CharField(max_length=20, choices=ROLES, default='STUDENT')
    department = models.ForeignKey(Department, on_delete=models.PROTECT, null=True, blank=True)
    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    enable_wakeup_calls = models.BooleanField(default=False)
    push_notifications = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    session_notifications = models.BooleanField(default=True)
    announcement_notifications = models.BooleanField(default=True)
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    matric_number = models.CharField(max_length=20, unique=True, null=True, blank=True)
    level = models.CharField(max_length=3, choices=LEVELS, null=True, blank=True)
    registration_completed = models.BooleanField(default=False)
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)


class PushSubscription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    endpoint = models.URLField(max_length=500)
    p256dh = models.CharField(max_length=255)
    auth = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'endpoint')
class PasskeyCredential(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="passkeys",
    )

    credential_id = models.BinaryField(
        unique=True,
    )

    public_key = models.BinaryField()

    sign_count = models.PositiveIntegerField(
        default=0,
    )

    device_type = models.CharField(
        max_length=30,
        blank=True,
    )

    backed_up = models.BooleanField(
        default=False,
    )

    device_name = models.CharField(
        max_length=100,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    last_used_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} passkey"
    
class PasskeyChallenge(models.Model):
    CHALLENGE_TYPES = (
        ("REGISTRATION", "Registration"),
        ("AUTHENTICATION", "Authentication"),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="passkey_challenges",
    )

    challenge = models.BinaryField()

    challenge_type = models.CharField(
        max_length=20,
        choices=CHALLENGE_TYPES,
    )

    session_id = models.PositiveBigIntegerField(
    null=True,
    blank=True,
)

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    expires_at = models.DateTimeField()

    used = models.BooleanField(
        default=False,
    )

    class Meta:
        indexes = [
            models.Index(
                fields=["user", "challenge_type", "used"]
            ),
        ]
class AttendancePasskeyGrant(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="attendance_passkey_grants",
    )

    session_id = models.PositiveBigIntegerField(
    null=True,
    blank=True,
)

    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    expires_at = models.DateTimeField()

    used = models.BooleanField(default=False)

    def __str__(self):
        return f"Attendance passkey grant for {self.user.username}"


class AdminAuditEvent(models.Model):
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admin_audit_events",
    )
    action = models.CharField(max_length=40)
    target_type = models.CharField(max_length=40)
    target_id = models.CharField(max_length=64, blank=True)
    summary = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action}: {self.summary}"