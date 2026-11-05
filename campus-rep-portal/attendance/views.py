import logging
import math
import re
from datetime import date
from threading import Thread

from rest_framework import generics, permissions
from .models import LectureSession
from rest_framework import serializers
from .serializers import LectureSessionSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse, FileResponse
from django.utils.text import get_valid_filename
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import models, transaction
from django.db.models import Exists, OuterRef
from django.utils import timezone
from rest_framework import status
from .models import LectureSession, AttendanceRecord, Notification, CampusDocument, WeeklyAttendanceRegister, WeeklyAttendanceEntry
from .utils import haversine_distance, is_location_confidently_within_radius
from .models import Announcement
from .serializers import AnnouncementSerializer, CampusDocumentSerializer, CampusDocumentUploadSerializer
from rest_framework.exceptions import ValidationError
from .models import AuditLog
import openpyxl
from openpyxl.styles import Font, Alignment, Border, Side
from accounts.models import AttendancePasskeyGrant, LecturerTeachingAssignment, User
from accounts.push import send_email_to_user, send_push_to_user


logger = logging.getLogger(__name__)


def record_audit_event(*, user, action, session):
    """Record an audit event without making the completed action look failed."""
    try:
        AuditLog.objects.create(
            rep=user,
            action=action,
            course_code=session.course_code,
            venue_name=session.venue_name,
        )
    except Exception as exc:
        logger.warning(
            "Could not record %s audit event for session %s: %s",
            action,
            session.pk,
            exc,
        )


def _deliver_external_notifications(students, preference, title, body):
    """Send optional push/email alerts outside the request-response cycle."""
    for student in students:
        try:
            if not getattr(student, preference):
                continue
            try:
                send_push_to_user(student, title, body[:180])
            except Exception as exc:
                logger.warning("Push notification failed for user %s: %s", student.pk, exc)
            try:
                send_email_to_user(student, title, body)
            except Exception as exc:
                logger.warning("Email notification failed for user %s: %s", student.pk, exc)
        except Exception as exc:
            logger.warning("Notification delivery setup failed for user %s: %s", student.pk, exc)


def notify_students(*, students, notification_type, title, body, preference):
    """Create in-app alerts quickly and defer slow third-party delivery.

    SMTP and web-push providers may be slow or unavailable. Those failures must
    never turn an already-completed session or announcement into an API error.
    """
    students = list(students)
    if not students:
        return

    try:
        Notification.objects.bulk_create(
            [
                Notification(
                    user_id=student.pk,
                    type=notification_type,
                    title=title,
                    body=body,
                )
                for student in students
            ]
        )
    except Exception as exc:
        logger.warning("Could not create in-app notifications: %s", exc)

    Thread(
        target=_deliver_external_notifications,
        args=(students, preference, title, body),
        daemon=True,
    ).start()

class AnnouncementListView(generics.ListAPIView):
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Announcement.objects.select_related('posted_by').filter(
            department=self.request.user.department,
            level=self.request.user.level
        )


class CheckInView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'STUDENT':
            return Response(
                {"detail": "Only student accounts can check in to attendance sessions."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not request.user.registration_completed:
            return Response(
                {"detail": "Complete registration with your matric number, WhatsApp number, and class representative code before checking in."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            session = LectureSession.objects.get(pk=pk, is_active=True, has_ended=False)
        except LectureSession.DoesNotExist:
            return Response({"detail": "No active session found."}, status=status.HTTP_404_NOT_FOUND)

        if (
            request.user.department_id != session.department_id
            or request.user.level != session.level
        ):
            return Response(
                {"detail": "This session is not assigned to your department and level."},
                status=status.HTTP_403_FORBIDDEN,
            )

        student_lat = request.data.get('latitude')
        student_lon = request.data.get('longitude')
        accuracy = request.data.get('accuracy')

        if student_lat is None or student_lon is None:
            return Response({"detail": "latitude and longitude are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            distance = haversine_distance(
                student_lat, student_lon, session.latitude, session.longitude,
            )
            accuracy_meters = None if accuracy is None else float(accuracy)
            if accuracy_meters is not None and (
                not math.isfinite(accuracy_meters) or accuracy_meters < 0
            ):
                raise ValueError("accuracy must be a finite, non-negative number.")
        except (TypeError, ValueError):
            return Response(
                {"detail": "GPS coordinates and accuracy must be valid numbers within valid ranges."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Older clients may omit accuracy during a staggered deployment. New clients
        # send it, allowing us to reject fixes whose uncertainty crosses the geofence.
        if accuracy_meters is not None and not is_location_confidently_within_radius(
            distance, accuracy_meters, session.radius_meters
        ):
            return Response(
                {
                    "detail": (
                        f"GPS reading is not accurate enough to confirm you are inside "
                        f"the {session.radius_meters}m venue radius. Your estimated "
                        f"distance is {int(distance)}m with ±{int(accuracy_meters)}m accuracy. "
                        "Move to an open area and try again."
                    ),
                    "distance_meters": round(distance, 1),
                    "accuracy_meters": round(accuracy_meters, 1),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if distance > session.radius_meters:
            return Response(
                {"detail": f"Too far from venue. You are {int(distance)}m away, limit is {session.radius_meters}m."},
                status=status.HTTP_403_FORBIDDEN
            )

        grant_token = request.data.get("attendance_grant")
        if not grant_token:
            return Response(
                {
                    "detail": "Verify your passkey before checking in.",
                    "passkey_required": True,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Lock the student row so two parallel requests cannot consume separate
        # grants and create duplicate attendance records for one student.
        with transaction.atomic():
            User.objects.select_for_update().get(pk=request.user.pk)

            if AttendanceRecord.objects.filter(
                student=request.user,
                session=session,
            ).exists():
                return Response(
                    {"detail": "Already checked in."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                grant = AttendancePasskeyGrant.objects.select_for_update().get(
                    token=grant_token,
                    user=request.user,
                    session_id=session.pk,
                    used=False,
                    expires_at__gte=timezone.now(),
                )
            except (
                AttendancePasskeyGrant.DoesNotExist,
                DjangoValidationError,
                ValueError,
            ):
                return Response(
                    {
                        "detail": "Your passkey verification has expired or is not valid for this session. Verify your passkey again.",
                        "passkey_required": True,
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            AttendanceRecord.objects.create(student=request.user, session=session)
            grant.used = True
            grant.save(update_fields=["used"])

        return Response({"detail": "Checked in successfully.", "distance_meters": int(distance)}, status=status.HTTP_201_CREATED)

class IsClassRep(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'CLASS_REP'


def _weekly_register_report(user, academic_year=None):
    registers = WeeklyAttendanceRegister.objects.filter(
        department=user.department,
        level=user.level,
    )
    if academic_year:
        registers = registers.filter(academic_year=academic_year)
    registers = list(registers.order_by('academic_year', 'week_number'))
    students = User.objects.filter(
        role='STUDENT',
        department=user.department,
        level=user.level,
        is_active=True,
    ).order_by('last_name', 'first_name', 'username')
    entries = WeeklyAttendanceEntry.objects.filter(
        register__in=registers,
        student__in=students,
    ).select_related('register')
    status_by_pair = {
        (entry.student_id, entry.register_id): entry.status
        for entry in entries
    }
    week_data = [
        {
            'id': register.pk,
            'academic_year': register.academic_year,
            'week_number': register.week_number,
            'week_start_date': register.week_start_date.isoformat(),
            'created_at': register.created_at.isoformat(),
        }
        for register in registers
    ]
    student_data = []
    for student in students:
        statuses = {}
        present = absent = excused = unmarked = 0
        for register in registers:
            status_value = status_by_pair.get((student.pk, register.pk), 'UNMARKED')
            statuses[str(register.pk)] = status_value
            if status_value == 'PRESENT':
                present += 1
            elif status_value == 'ABSENT':
                absent += 1
            elif status_value == 'EXCUSED':
                excused += 1
            else:
                unmarked += 1
        opportunities = present + absent
        student_data.append({
            'id': student.pk,
            'name': student.get_full_name() or student.username,
            'matric_number': student.matric_number or '',
            'statuses': statuses,
            'present': present,
            'absent': absent,
            'excused': excused,
            'unmarked': unmarked,
            'attendance_percentage': round((present / opportunities) * 100) if opportunities else 0,
        })
    return {
        'academic_year': academic_year or '',
        'department': user.department.name if user.department_id else '',
        'level': user.level or '',
        'weeks': week_data,
        'students': student_data,
        'summary': {
            'students': len(student_data),
            'weeks_recorded': len(week_data),
            'present_marks': sum(row['present'] for row in student_data),
            'absent_marks': sum(row['absent'] for row in student_data),
        },
    }


class WeeklyAttendanceReportView(APIView):
    permission_classes = [IsClassRep]

    def get(self, request):
        academic_year = (request.query_params.get('academic_year') or '').strip()
        if academic_year and not re.fullmatch(r'\d{4}/\d{4}', academic_year):
            return Response({'detail': 'Academic year must use the format YYYY/YYYY.'}, status=status.HTTP_400_BAD_REQUEST)
        if not request.user.department or not request.user.level:
            return Response({'detail': 'Your Class Rep account must have a department and level.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(_weekly_register_report(request.user, academic_year or None))

    def post(self, request):
        user = request.user
        if not user.department or not user.level:
            return Response({'detail': 'Your Class Rep account must have a department and level.'}, status=status.HTTP_400_BAD_REQUEST)
        academic_year = str(request.data.get('academic_year', '')).strip()
        if not re.fullmatch(r'\d{4}/\d{4}', academic_year):
            return Response({'academic_year': 'Use the format YYYY/YYYY.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            week_number = int(request.data.get('week_number'))
            if not 1 <= week_number <= 52:
                raise ValueError
        except (TypeError, ValueError):
            return Response({'week_number': 'Choose one week between 1 and 52.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            week_start_date = date.fromisoformat(str(request.data.get('week_start_date', '')))
        except (TypeError, ValueError):
            return Response({'week_start_date': 'Provide the Monday date for this week.'}, status=status.HTTP_400_BAD_REQUEST)
        if week_start_date.weekday() != 0:
            return Response({'week_start_date': 'The week starting date must be a Monday.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            register, created = WeeklyAttendanceRegister.objects.get_or_create(
                department=user.department,
                level=user.level,
                academic_year=academic_year,
                week_number=week_number,
                defaults={'week_start_date': week_start_date, 'created_by': user},
            )
            if not created:
                return Response({'detail': 'This week already has a register. Select it to continue recording attendance.'}, status=status.HTTP_409_CONFLICT)
            roster = User.objects.filter(
                role='STUDENT',
                department=user.department,
                level=user.level,
                is_active=True,
            )
            WeeklyAttendanceEntry.objects.bulk_create([
                WeeklyAttendanceEntry(register=register, student=student)
                for student in roster
            ])
        return Response({
            'detail': f'Week {week_number} register created.',
            'register_id': register.pk,
            'report': _weekly_register_report(user, academic_year),
        }, status=status.HTTP_201_CREATED)


class WeeklyAttendanceRegisterDetailView(APIView):
    permission_classes = [IsClassRep]

    def patch(self, request, pk):
        user = request.user
        try:
            register = WeeklyAttendanceRegister.objects.get(
                pk=pk,
                department=user.department,
                level=user.level,
            )
        except WeeklyAttendanceRegister.DoesNotExist:
            return Response({'detail': 'Weekly register not found.'}, status=status.HTTP_404_NOT_FOUND)

        entries = request.data.get('entries')
        if not isinstance(entries, list) or not entries:
            return Response({'entries': 'Provide at least one student attendance status.'}, status=status.HTTP_400_BAD_REQUEST)
        allowed = {'UNMARKED', 'PRESENT', 'ABSENT', 'EXCUSED'}
        validated_entries = []
        seen_student_ids = set()
        for item in entries:
            if not isinstance(item, dict):
                return Response({'entries': 'Each entry must contain student_id and status.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                student_id = int(item.get('student_id'))
            except (TypeError, ValueError):
                return Response({'entries': 'Each entry must contain a valid student_id.'}, status=status.HTTP_400_BAD_REQUEST)
            status_value = str(item.get('status', '')).upper()
            if status_value not in allowed:
                return Response({'entries': f'Invalid attendance status: {status_value}.'}, status=status.HTTP_400_BAD_REQUEST)
            if student_id in seen_student_ids:
                return Response({'entries': f'Student {student_id} appears more than once.'}, status=status.HTTP_400_BAD_REQUEST)
            seen_student_ids.add(student_id)
            validated_entries.append((student_id, status_value))

        valid_student_ids = set(
            User.objects.filter(
                pk__in=seen_student_ids,
                role='STUDENT',
                department=user.department,
                level=user.level,
            ).values_list('pk', flat=True)
        )
        for student_id, _ in validated_entries:
            if student_id not in valid_student_ids:
                return Response({'entries': f'Student {student_id} is not in this class.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            existing_map = {
                entry.student_id: entry
                for entry in WeeklyAttendanceEntry.objects.filter(
                    register=register,
                    student_id__in=seen_student_ids,
                )
            }
            now = timezone.now()
            to_create = []
            to_update = []
            for student_id, status_value in validated_entries:
                marked_by = user if status_value != 'UNMARKED' else None
                entry = existing_map.get(student_id)
                if entry is None:
                    to_create.append(
                        WeeklyAttendanceEntry(
                            register=register,
                            student_id=student_id,
                            status=status_value,
                            marked_by=marked_by,
                        )
                    )
                else:
                    entry.status = status_value
                    entry.marked_by = marked_by
                    entry.updated_at = now
                    to_update.append(entry)
            if to_create:
                WeeklyAttendanceEntry.objects.bulk_create(to_create)
            if to_update:
                WeeklyAttendanceEntry.objects.bulk_update(to_update, ['status', 'marked_by', 'updated_at'])
        return Response({
            'detail': 'Weekly attendance saved.',
            'report': _weekly_register_report(user, register.academic_year),
        })


class IsSessionManager(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                user.role == "CLASS_REP"
                or (
                    user.role == "LECTURER"
                    and user.lecturer_approved
                    and user.is_active
                )
            )
        )


def session_queryset_for_manager(user):
    base_qs = LectureSession.objects.select_related("department").annotate(
        attendee_count=models.Count("attendancerecord")
    )
    if user.role == "LECTURER":
        return base_qs.filter(created_by=user)
    return base_qs.filter(
        department=user.department,
        level=user.level,
    )


class LectureSessionCreateView(generics.CreateAPIView):
    queryset = LectureSession.objects.all()
    serializer_class = LectureSessionSerializer
    permission_classes = [IsSessionManager]

    def perform_create(self, serializer):
        user = self.request.user
        level = serializer.validated_data["level"]
        if user.role == "LECTURER":
            department = serializer.validated_data.get("department")
            if not department or not LecturerTeachingAssignment.objects.filter(
                lecturer=user,
                department=department,
                level=level,
            ).exists():
                raise ValidationError(
                    {"department": "Choose a department and level approved for your lecturer account."}
                )
        else:
            department = user.department
            if not department:
                raise ValidationError(
                    {"department": "Your account is not assigned to a department."}
                )
            if level != user.level:
                raise ValidationError(
                    {"level": "Class representatives can only create sessions for their own level."}
                )

        start_now = str(self.request.data.get("start_now", "")).strip().lower() in {"1", "true", "yes"}
        session = serializer.save(
            department=department,
            created_by=user,
            is_active=start_now,
            has_ended=False,
        )
        record_audit_event(user=user, action='CREATED', session=session)
        if start_now:
            record_audit_event(user=user, action='STARTED', session=session)
        students = User.objects.filter(
            department=session.department, level=session.level, role='STUDENT'
        )
        notify_students(
            students=students,
            notification_type='SESSION',
            title=f'{session.course_code} is now live' if start_now else f'{session.course_code} session created',
            body=(
                f'Attendance is open at {session.venue_name} · {session.level} Level.'
                if start_now
                else f'{session.venue_name} · {session.level} Level. Your class rep has created a new attendance session.'
            ),
            preference='session_notifications',
        )
class LectureSessionToggleView(APIView):
    permission_classes = [IsSessionManager]

    def post(self, request, pk):
        try:
            session = session_queryset_for_manager(request.user).get(pk=pk)
        except LectureSession.DoesNotExist:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        if session.has_ended:
            return Response(
                {'detail': 'This session has already ended and cannot be reopened. Create a new session instead.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if session.is_active:
            session.is_active = False
            session.has_ended = True
            session.save(update_fields=['is_active', 'has_ended'])
            record_audit_event(user=request.user, action='ENDED', session=session)
            return Response({'detail': 'Session ended.', 'session': LectureSessionSerializer(session).data})

        session.is_active = True
        session.save(update_fields=['is_active'])
        record_audit_event(user=request.user, action='STARTED', session=session)
        students = User.objects.filter(
            department=session.department,
            level=session.level,
            role='STUDENT',
        )
        notify_students(
            students=students,
            notification_type='SESSION',
            title=f'{session.course_code} is now live',
            body=f'Attendance is open at {session.venue_name}.',
            preference='session_notifications',
        )
        return Response({'detail': 'Session started.', 'session': LectureSessionSerializer(session).data})

class AnnouncementCreateView(generics.CreateAPIView):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [IsClassRep]

    def perform_create(self, serializer):
        announcement = serializer.save(
            department=self.request.user.department,
            level=self.request.user.level,
            posted_by=self.request.user,
        )
        students = User.objects.filter(
            department=announcement.department, level=announcement.level, role='STUDENT'
        )
        notify_students(
            students=students,
            notification_type='ANNOUNCEMENT',
            title=announcement.title,
            body=announcement.body,
            preference='announcement_notifications',
        )

class ActiveSessionsView(generics.ListAPIView):
    serializer_class = LectureSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        checked_in = AttendanceRecord.objects.filter(student=self.request.user, session_id=OuterRef("pk"))
        return LectureSession.objects.select_related("department").filter(
            department=self.request.user.department,
            level=self.request.user.level,
            is_active=True,
            has_ended=False,
        ).annotate(
            attendee_count=models.Count("attendancerecord"),
            student_has_checked_in=Exists(checked_in),
        )
class MySessionsView(generics.ListAPIView):
    serializer_class = LectureSessionSerializer
    permission_classes = [IsSessionManager]

    def get_queryset(self):
        return session_queryset_for_manager(self.request.user).order_by('-created_at', '-id')
class MyStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    ELIGIBILITY_THRESHOLD = 70

    def get(self, request):
        attended_set = set(
            AttendanceRecord.objects.filter(
                student=request.user,
            ).values_list('session_id', flat=True)
        )
        eligible_ids = list(
            LectureSession.objects.filter(
                department=request.user.department,
                level=request.user.level,
            ).filter(
                models.Q(has_ended=True) | models.Q(pk__in=attended_set)
            ).order_by('-created_at', '-id').values_list('id', flat=True)
        )

        total_sessions = len(eligible_ids)
        attended = sum(1 for sid in eligible_ids if sid in attended_set)
        rate = round((attended / total_sessions) * 100) if total_sessions > 0 else 0

        streak = 0
        for sid in eligible_ids:
            if sid in attended_set:
                streak += 1
            else:
                break

        eligibility_status = "eligible" if rate >= self.ELIGIBILITY_THRESHOLD else "at_risk"
        classes_until_risk = None

        if eligibility_status == "eligible" and total_sessions > 0:
            n = 0
            while True:
                n += 1
                projected_rate = (attended / (total_sessions + n)) * 100
                if projected_rate < self.ELIGIBILITY_THRESHOLD:
                    classes_until_risk = n - 1
                    break
                if n > 100:
                    classes_until_risk = 100
                    break

        return Response({
            "attended": attended,
            "total_sessions": total_sessions,
            "rate": rate,
            "streak": streak,
            "eligibility_status": eligibility_status,
            "classes_until_risk": classes_until_risk,
            "eligibility_threshold": self.ELIGIBILITY_THRESHOLD,
        })
class LectureSessionDeleteView(generics.DestroyAPIView):
    serializer_class = LectureSessionSerializer
    permission_classes = [IsClassRep]

    def get_queryset(self):
        return LectureSession.objects.filter(
            department=self.request.user.department,
            level=self.request.user.level,
        )

    def perform_destroy(self, instance):
        instance.delete()
        record_audit_event(user=self.request.user, action='DELETED', session=instance)

class ExportAttendanceView(APIView):
    permission_classes = [IsSessionManager]

    def get(self, request, pk):
        try:
            session = session_queryset_for_manager(request.user).get(pk=pk)
        except LectureSession.DoesNotExist:
            return Response({"detail": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        students = User.objects.filter(
            role='STUDENT',
            department=session.department,
            level=session.level,
        ).order_by('last_name', 'first_name', 'username')
        attendance_by_student = {
            record.student_id: record
            for record in AttendanceRecord.objects.filter(
                session=session,
                student__in=students,
            ).select_related('marked_by')
        }

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Attendance"

        bold = Font(bold=True, size=12)
        title_font = Font(bold=True, size=14)
        thin_border = Border(
            left=Side(style='thin'), right=Side(style='thin'),
            top=Side(style='thin'), bottom=Side(style='thin')
        )
        center = Alignment(horizontal='center')

        ws.merge_cells('A1:F1')
        ws['A1'] = f"{session.course_code} — Attendance Sheet"
        ws['A1'].font = title_font

        ws['A2'] = f"Venue: {session.venue_name}"
        ws['A3'] = f"Date: {session.created_at.strftime('%B %d, %Y')}"
        ws['A2'].font = Font(size=10)
        ws['A3'].font = Font(size=10)

        header_row = 5
        ws.cell(row=header_row, column=1, value="S/N").font = bold
        ws.cell(row=header_row, column=2, value="Full Name").font = bold
        ws.cell(row=header_row, column=3, value="Matric Number").font = bold
        ws.cell(row=header_row, column=4, value="Attendance").font = bold
        ws.cell(row=header_row, column=5, value="Time").font = bold
        ws.cell(row=header_row, column=6, value="Marked by").font = bold

        for col in range(1, 7):
            ws.cell(row=header_row, column=col).border = thin_border
            ws.cell(row=header_row, column=col).alignment = center

        row = header_row + 1
        for i, student in enumerate(students, start=1):
            record = attendance_by_student.get(student.pk)
            full_name = student.get_full_name() or student.username
            matric = student.matric_number or "N/A"

            ws.cell(row=row, column=1, value=i).border = thin_border
            ws.cell(row=row, column=2, value=full_name).border = thin_border
            ws.cell(row=row, column=3, value=matric).border = thin_border
            ws.cell(
                row=row,
                column=4,
                value="Present" if record else "Absent",
            ).border = thin_border
            ws.cell(
                row=row,
                column=5,
                value=record.timestamp.strftime('%H:%M:%S') if record else "—",
            ).border = thin_border
            marker = (
                record.marked_by.get_full_name() or record.marked_by.username
                if record and record.marked_by_id
                else "Student"
                if record
                else "—"
            )
            ws.cell(row=row, column=6, value=marker).border = thin_border
            row += 1

        ws.column_dimensions['A'].width = 6
        ws.column_dimensions['B'].width = 30
        ws.column_dimensions['C'].width = 20
        ws.column_dimensions['D'].width = 14
        ws.column_dimensions['E'].width = 14
        ws.column_dimensions['F'].width = 24

        sig_row = row + 2
        signature = "Lecturer's" if request.user.role == "LECTURER" else "Class Rep's"
        ws.cell(row=sig_row, column=1, value=f"{signature} Signature: _______________________").font = Font(size=10)

        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        filename = f"{session.course_code}_{session.venue_name}_attendance.xlsx"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        wb.save(response)

        return response


class MarkClassmateAttendanceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        rep = request.user
        is_class_rep = rep.role == 'CLASS_REP'
        if not is_class_rep and not rep.is_superuser:
            return Response(
                {"detail": "Only class representatives and administrators can mark attendance."},
                status=status.HTTP_403_FORBIDDEN,
            )

        session_id = request.data.get('session_id')
        if not session_id:
            return Response(
                {"detail": "Choose an active attendance session."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sessions = LectureSession.objects.filter(
            pk=session_id,
            is_active=True,
            has_ended=False,
        )
        if is_class_rep:
            sessions = sessions.filter(
                department=rep.department,
                level=rep.level,
            )
        session = sessions.first()
        if not session:
            return Response(
                {"detail": "That active session is unavailable for your account."},
                status=status.HTTP_404_NOT_FOUND,
            )

        student = User.objects.filter(
            pk=pk,
            role='STUDENT',
            department=session.department,
            level=session.level,
            is_active=True,
        ).first()
        if not student:
            return Response(
                {"detail": "Active student not found in your class."},
                status=status.HTTP_404_NOT_FOUND,
            )

        record, created = AttendanceRecord.objects.get_or_create(
            student=student,
            session=session,
            defaults={
                "check_in_method": "REP_MANUAL",
                "marked_by": rep,
            },
        )
        return Response(
            {
                "detail": (
                    "Attendance marked present."
                    if created
                    else "This student is already marked present for this session."
                ),
                "student_id": student.pk,
                "session_id": session.pk,
                "created": created,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class AdminSessionRosterView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        if not request.user.is_superuser:
            return Response(
                {"detail": "Only administrators can view this class roster."},
                status=status.HTTP_403_FORBIDDEN,
            )

        session = LectureSession.objects.filter(
            pk=pk,
            is_active=True,
            has_ended=False,
        ).first()
        if not session:
            return Response(
                {"detail": "Active attendance session not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        students = User.objects.filter(
            role='STUDENT',
            department=session.department,
            level=session.level,
            is_active=True,
        ).exclude(
            pk__in=AttendanceRecord.objects.filter(
                session=session,
            ).values_list('student_id', flat=True)
        ).order_by('last_name', 'first_name', 'username')
        return Response([
            {
                "id": student.pk,
                "name": student.get_full_name() or student.username,
                "matric_number": student.matric_number or "",
            }
            for student in students
        ])


class IsStudentOrRep(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in {'STUDENT', 'CLASS_REP'}


class CampusDocumentListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return CampusDocumentUploadSerializer if self.request.method == 'POST' else CampusDocumentSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = CampusDocument.objects.select_related('department', 'uploaded_by')
        is_site_admin = user.is_superuser or user.role == 'SUPER_ADMIN'
        if not is_site_admin:
            if not user.department:
                return queryset.none()
            # Keep academic documents inside the user's department and level.
            queryset = queryset.filter(department=user.department, level=user.level)
        query = (self.request.query_params.get('q') or '').strip()
        if query:
            queryset = queryset.filter(
                models.Q(title__icontains=query)
                | models.Q(description__icontains=query)
                | models.Q(course_code__icontains=query)
                | models.Q(uploaded_by__first_name__icontains=query)
                | models.Q(uploaded_by__last_name__icontains=query)
            )
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        is_site_admin = user.is_superuser or user.role == 'SUPER_ADMIN'

        if is_site_admin:
            department = serializer.validated_data.get('department')
            level = serializer.validated_data.get('level')
            if not department or not level:
                raise ValidationError('Choose a department and level for this document.')
        else:
            if user.role not in {'STUDENT', 'CLASS_REP'}:
                raise ValidationError('Only students, class representatives, and site administrators can upload documents.')
            if not user.department or not user.level:
                raise ValidationError('Complete your department and level before uploading a document.')
            level = serializer.validated_data.get('level')
            if level != user.level:
                raise ValidationError({'level': 'You can only upload documents for your current level.'})
            department = user.department

        serializer.save(department=department, uploaded_by=user)


class CampusDocumentDownloadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            document = CampusDocument.objects.select_related('department').get(pk=pk)
        except CampusDocument.DoesNotExist:
            return Response({'detail': 'Document not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_site_admin = request.user.is_superuser or request.user.role == 'SUPER_ADMIN'
        if not is_site_admin and (
            document.department_id != getattr(request.user.department, 'id', None)
            or document.level != request.user.level
        ):
            return Response({'detail': 'You do not have access to this document.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            document.file.open('rb')
        except (FileNotFoundError, OSError, ValueError):
            return Response({'detail': 'The document file is unavailable.'}, status=status.HTTP_404_NOT_FOUND)

        filename = get_valid_filename(document.file.name.rsplit('/', 1)[-1]) or f'document-{document.pk}.pdf'
        response = FileResponse(document.file, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'type', 'title', 'body', 'is_read', 'created_at']


class AuditLogSerializer(serializers.ModelSerializer):
    rep_name = serializers.CharField(source='rep.get_full_name', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'action', 'course_code', 'venue_name', 'rep_name', 'timestamp']


class AuditLogView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsClassRep]

    def get_queryset(self):
        return AuditLog.objects.select_related('rep').filter(
            rep__department=self.request.user.department
        )[:50]

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)[:50]


class NotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({'detail': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({'detail': 'Notification marked as read.'})


class NotificationReadAllView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'detail': 'All notifications marked as read.'})


from .models import ClassCode, generate_class_code


class MyClassCodeView(APIView):
    permission_classes = [IsClassRep]

    def get(self, request):
        code_obj, created = ClassCode.objects.get_or_create(
            department=request.user.department,
            level=request.user.level,
        )
        return Response({"code": code_obj.code})

    def post(self, request):
        code_obj, created = ClassCode.objects.get_or_create(
            department=request.user.department,
            level=request.user.level,
        )
        code_obj.code = generate_class_code()
        code_obj.save()
        return Response({"code": code_obj.code})
class MyHistoryView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        sessions = LectureSession.objects.filter(
            department=request.user.department,
            level=request.user.level,
            has_ended=True,
        ).order_by('-created_at')

        attended_ids = set(
            AttendanceRecord.objects.filter(
                student=request.user, session__in=sessions
            ).values_list('session_id', flat=True)
        )

        data = [
            {
                'id': s.id,
                'course_code': s.course_code,
                'venue_name': s.venue_name,
                'date': s.created_at,
                'status': 'attended' if s.id in attended_ids else 'missed',
            }
            for s in sessions
        ]
        return Response(data)
