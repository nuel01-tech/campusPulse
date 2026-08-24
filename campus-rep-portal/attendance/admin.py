from django.contrib import admin
from .models import LectureSession, AttendanceRecord

admin.site.register(LectureSession)
admin.site.register(AttendanceRecord)