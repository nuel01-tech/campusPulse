from django.contrib import admin
from .models import LectureSession, AttendanceRecord, CampusDocument

admin.site.register(LectureSession)
admin.site.register(AttendanceRecord)
admin.site.register(CampusDocument)
