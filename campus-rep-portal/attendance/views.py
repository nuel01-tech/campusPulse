import logging
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
from django.utils import timezone
from rest_framework import status
from .models import LectureSession, AttendanceRecord, Notification, CampusDocument
from .utils import haversine_distance
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
        return Announcement.objects.filter(
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
            session = LectureSession.objects.get(pk=pk, is_active=True)
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

        if student_lat is None or student_lon is None:
            return Response({"detail": "latitude and longitude are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            distance = haversine_distance(
                float(student_lat), float(student_lon),
                session.latitude, session.longitude,
            )
        except (TypeError, ValueError):
            return Response(
                {"detail": "latitude and longitude must be valid numbers."},
                status=status.HTTP_400_BAD_REQUEST,
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
    if user.role == "LECTURER":
        return LectureSession.objects.filter(created_by=user)
    return LectureSession.objects.filter(
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

        session = serializer.save(
            department=department,
            created_by=user,
            is_active=False,
            has_ended=False,
        )
        record_audit_event(user=user, action='CREATED', session=session)
        students = User.objects.filter(
            department=session.department, level=session.level, role='STUDENT'
        )
        notify_students(
            students=students,
            notification_type='SESSION',
            title=f'{session.course_code} session created',
            body=(
                f'{session.venue_name} · {session.level} Level. '
                'Your class rep has created a new attendance session.'
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
        return LectureSession.objects.filter(
            department=self.request.user.department,
            level=self.request.user.level,
            is_active=True
        )
class MySessionsView(generics.ListAPIView):
    serializer_class = LectureSessionSerializer
    permission_classes = [IsSessionManager]

    def get_queryset(self):
        return session_queryset_for_manager(self.request.user).order_by('-created_at')
class MyStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    ELIGIBILITY_THRESHOLD = 70

    def get(self, request):
        eligible_sessions = LectureSession.objects.filter(
            department=request.user.department,
            level=request.user.level
        ).order_by('-created_at')

        total_sessions = eligible_sessions.count()
        attended = AttendanceRecord.objects.filter(
            student=request.user,
            session__in=eligible_sessions
        ).count()
        rate = round((attended / total_sessions) * 100) if total_sessions > 0 else 0

        streak = 0
        for session in eligible_sessions:
            if AttendanceRecord.objects.filter(student=request.user, session=session).exists():
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
        return AuditLog.objects.filter(rep__department=self.request.user.department)

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
