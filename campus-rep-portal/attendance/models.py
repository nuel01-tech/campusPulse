import random
import string

from django.db import models
from django.conf import settings
from accounts.models import Department


class LectureSession(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    level = models.CharField(max_length=3, choices=[
        ('100', '100 Level'),
        ('200', '200 Level'),
        ('300', '300 Level'),
        ('400', '400 Level'),
        ('500', '500 Level'),
    ])
    course_code = models.CharField(max_length=10)
    venue_name = models.CharField(max_length=100)
    latitude = models.FloatField()
    longitude = models.FloatField()
    radius_meters = models.IntegerField(default=50)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    has_ended = models.BooleanField(default=False)

class AttendanceRecord(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    session = models.ForeignKey(LectureSession, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'session')
class Announcement(models.Model):
    CATEGORY_CHOICES = (
        ('GENERAL', 'General'),
        ('ASSIGNMENT', 'Assignment'),
        ('VENUE_CHANGE', 'Venue Change'),
    )
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    level = models.CharField(max_length=3, choices=[
        ('100', '100 Level'), ('200', '200 Level'), ('300', '300 Level'),
        ('400', '400 Level'), ('500', '500 Level'),
    ])
    category = models.CharField(max_length=15, choices=CATEGORY_CHOICES, default='GENERAL')
    title = models.CharField(max_length=150)
    body = models.TextField()
    due_date = models.DateField(null=True, blank=True)
    posted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
class AuditLog(models.Model):
    ACTION_CHOICES = (
        ('CREATED', 'Session Created'),
        ('ENDED', 'Session Ended'),
        ('DELETED', 'Session Deleted'),
    )
    rep = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    course_code = models.CharField(max_length=10)
    venue_name = models.CharField(max_length=100)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']


def generate_class_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


class ClassCode(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    level = models.CharField(max_length=3, choices=[
        ('100', '100 Level'), ('200', '200 Level'), ('300', '300 Level'),
        ('400', '400 Level'), ('500', '500 Level'),
    ])
    code = models.CharField(max_length=6, default=generate_class_code)

    class Meta:
        unique_together = ('department', 'level')