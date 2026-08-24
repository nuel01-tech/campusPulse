from rest_framework import generics, permissions
from .models import LectureSession
from rest_framework import serializers
from .serializers import LectureSessionSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import LectureSession, AttendanceRecord
from .utils import haversine_distance
from .models import Announcement
from .serializers import AnnouncementSerializer
from rest_framework.exceptions import ValidationError
from .models import AuditLog
import openpyxl
from openpyxl.styles import Font, Alignment, Border, Side
from accounts.models import User
from accounts.views import send_push_to_user

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
        if not request.user.matric_number:
            return Response(
                {"detail": "Please add your matric number before checking in."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            session = LectureSession.objects.get(pk=pk, is_active=True)
        except LectureSession.DoesNotExist:
            return Response({"detail": "No active session found."}, status=status.HTTP_404_NOT_FOUND)

        student_lat = request.data.get('latitude')
        student_lon = request.data.get('longitude')

        if student_lat is None or student_lon is None:
            return Response({"detail": "latitude and longitude are required."}, status=status.HTTP_400_BAD_REQUEST)

        distance = haversine_distance(
            float(student_lat), float(student_lon),
            session.latitude, session.longitude
        )

        if distance > session.radius_meters:
            return Response(
                {"detail": f"Too far from venue. You are {int(distance)}m away, limit is {session.radius_meters}m."},
                status=status.HTTP_403_FORBIDDEN
            )

        record, created = AttendanceRecord.objects.get_or_create(student=request.user, session=session)

        if not created:
            return Response({"detail": "Already checked in."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": "Checked in successfully.", "distance_meters": int(distance)}, status=status.HTTP_201_CREATED)

class IsClassRep(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'CLASS_REP'


class LectureSessionCreateView(generics.CreateAPIView):
    queryset = LectureSession.objects.all()
    serializer_class = LectureSessionSerializer
    permission_classes = [IsClassRep]

    def perform_create(self, serializer):
        session = serializer.save(department=self.request.user.department)
        AuditLog.objects.create(
            rep=self.request.user,
            action='CREATED',
            course_code=session.course_code,
            venue_name=session.venue_name,
        )
class LectureSessionToggleView(generics.UpdateAPIView):
    queryset = LectureSession.objects.all()
    serializer_class = LectureSessionSerializer
    permission_classes = [IsClassRep]

    def get_queryset(self):
        return LectureSession.objects.filter(department=self.request.user.department)

    def perform_update(self, serializer):
        if serializer.instance.has_ended:
            raise ValidationError("This session has already ended and cannot be reopened. Create a new session instead.")

        if serializer.instance.is_active:
            serializer.save(is_active=False, has_ended=True)
            AuditLog.objects.create(
                rep=self.request.user,
                action='ENDED',
                course_code=serializer.instance.course_code,
                venue_name=serializer.instance.venue_name,
            )
        else:
            serializer.save(is_active=True)
    try:
        students = User.objects.filter(
            department=serializer.instance.department,
            level=serializer.instance.level,
            role='STUDENT'
        )
        for student in students:
            send_push_to_user(
                student,
                f"{serializer.instance.course_code} is now live",
                f"Check in at {serializer.instance.venue_name} — attendance is open now."
            )
    except Exception:
        pass

class AnnouncementCreateView(generics.CreateAPIView):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [IsClassRep]

    def perform_create(self, serializer):
        serializer.save(
            department=self.request.user.department,
            level=self.request.user.level,
            posted_by=self.request.user
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
    permission_classes = [IsClassRep]

    def get_queryset(self):
        return LectureSession.objects.filter(
            department=self.request.user.department
        ).order_by('-created_at')
class MyStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    ELIGIBILITY_THRESHOLD = 70

    def get(self, request):
        eligible_sessions = LectureSession.objects.filter(
            department=request.user.department,
            level=request.user.level
        ).order_by('-created_at')

        total_sessions = eligible_sessions.count()
        attended = AttendanceRecord.objects.filter(student=request.user).count()
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
        return LectureSession.objects.filter(department=self.request.user.department)

    def perform_destroy(self, instance):
        AuditLog.objects.create(
            rep=self.request.user,
            action='DELETED',
            course_code=instance.course_code,
            venue_name=instance.venue_name,
        )
        instance.delete()

class ExportAttendanceView(APIView):
    permission_classes = [IsClassRep]

    def get(self, request, pk):
        try:
            session = LectureSession.objects.get(pk=pk, department=request.user.department)
        except LectureSession.DoesNotExist:
            return Response({"detail": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        records = AttendanceRecord.objects.filter(session=session).select_related('student')

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

        ws.merge_cells('A1:B1')
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

        for col in range(1, 4):
            ws.cell(row=header_row, column=col).border = thin_border
            ws.cell(row=header_row, column=col).alignment = center

        row = header_row + 1
        for i, record in enumerate(records, start=1):
            full_name = record.student.get_full_name() or record.student.username
            matric = record.student.matric_number or "N/A"

            ws.cell(row=row, column=1, value=i).border = thin_border
            ws.cell(row=row, column=2, value=full_name).border = thin_border
            ws.cell(row=row, column=3, value=matric).border = thin_border
            row += 1

        ws.column_dimensions['A'].width = 6
        ws.column_dimensions['B'].width = 30
        ws.column_dimensions['C'].width = 20

        sig_row = row + 2
        ws.cell(row=sig_row, column=1, value="Class Rep's Signature: _______________________").font = Font(size=10)

        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        filename = f"{session.course_code}_{session.venue_name}_attendance.xlsx"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        wb.save(response)

        return response

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