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
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    enable_wakeup_calls = models.BooleanField(default=False)
    matric_number = models.CharField(max_length=20, unique=True, null=True, blank=True)
    level = models.CharField(max_length=3, choices=LEVELS, null=True, blank=True)
class PushSubscription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    endpoint = models.URLField(max_length=500)
    p256dh = models.CharField(max_length=255)
    auth = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'endpoint')