from django.urls import path
from .views import (
    LectureSessionCreateView,
    LectureSessionToggleView,
    LectureSessionDeleteView,
    CheckInView,
    ActiveSessionsView,
    MySessionsView,
    AnnouncementCreateView,
    AnnouncementListView,
    MyStatsView,
    ExportAttendanceView,
    AuditLogView,
    MyClassCodeView,
)

urlpatterns = [
    path('sessions/create/', LectureSessionCreateView.as_view(), name='session-create'),
    path('sessions/<int:pk>/toggle/', LectureSessionToggleView.as_view(), name='session-toggle'),
    path('sessions/<int:pk>/delete/', LectureSessionDeleteView.as_view(), name='session-delete'),
    path('sessions/<int:pk>/checkin/', CheckInView.as_view(), name='session-checkin'),
    path('sessions/<int:pk>/export/', ExportAttendanceView.as_view(), name='session-export'),
    path('sessions/active/', ActiveSessionsView.as_view(), name='sessions-active'),
    path('sessions/mine/', MySessionsView.as_view(), name='sessions-mine'),
    path('announcements/create/', AnnouncementCreateView.as_view(), name='announcement-create'),
    path('announcements/', AnnouncementListView.as_view(), name='announcement-list'),
    path('my-stats/', MyStatsView.as_view(), name='my-stats'),
    path('audit-log/', AuditLogView.as_view(), name='audit-log'),
    path('my-class-code/', MyClassCodeView.as_view(), name='my-class-code'),
]