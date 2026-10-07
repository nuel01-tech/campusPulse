from django.db import transaction
from django.db.models import Count, Q
from django.utils.dateparse import parse_date
from rest_framework import permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from attendance.models import (
    Announcement,
    AuditLog,
    CampusDocument,
    ClassCode,
    LectureSession,
)
from .models import AdminAuditEvent, Department, User


LEVELS = {value for value, _label in User.LEVELS}


class IsSiteSuperuser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class AdminPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100


def log_admin_action(request, action, target_type, target_id, summary):
    AdminAuditEvent.objects.create(
        actor=request.user,
        action=action,
        target_type=target_type,
        target_id=str(target_id or ""),
        summary=summary,
    )


def find_department(pk):
    try:
        return Department.objects.filter(pk=pk).first()
    except (TypeError, ValueError):
        return None


def department_data(department):
    return {
        "id": department.pk,
        "name": department.name,
        "faculty": department.faculty,
    }


def user_data(user):
    return {
        "id": user.pk,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "role": "SUPER_ADMIN" if user.is_superuser else user.role,
        "department": user.department_id,
        "department_name": user.department.name if user.department else "",
        "level": user.level or "",
        "matric_number": user.matric_number or "",
        "phone_number": user.phone_number or "",
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "date_joined": user.date_joined,
        "registration_completed": user.registration_completed,
    }


def session_data(session):
    attendee_count = getattr(session, "attendee_count", None)
    if attendee_count is None:
        attendee_count = session.attendancerecord_set.count()
    return {
        "id": session.pk,
        "department": session.department_id,
        "department_name": session.department.name,
        "level": session.level,
        "course_code": session.course_code,
        "venue_name": session.venue_name,
        "is_active": session.is_active,
        "has_ended": session.has_ended,
        "attendee_count": attendee_count,
        "created_at": session.created_at,
    }


def announcement_data(announcement):
    return {
        "id": announcement.pk,
        "department": announcement.department_id,
        "department_name": announcement.department.name,
        "level": announcement.level,
        "category": announcement.category,
        "title": announcement.title,
        "body": announcement.body,
        "due_date": announcement.due_date,
        "posted_by": announcement.posted_by.username,
        "created_at": announcement.created_at,
    }


def document_data(document):
    return {
        "id": document.pk,
        "title": document.title,
        "description": document.description,
        "course_code": document.course_code,
        "department": document.department_id,
        "department_name": document.department.name,
        "level": document.level,
        "file_name": document.file.name.rsplit("/", 1)[-1],
        "uploaded_by": document.uploaded_by.username,
        "created_at": document.created_at,
    }


class AdminSummaryView(APIView):
    permission_classes = [IsSiteSuperuser]

    def get(self, request):
        recent_admin_actions = AdminAuditEvent.objects.select_related("actor")[:10]
        return Response({
            "users": User.objects.count(),
            "active_users": User.objects.filter(is_active=True).count(),
            "departments": Department.objects.count(),
            "active_sessions": LectureSession.objects.filter(
                is_active=True,
                has_ended=False,
            ).count(),
            "announcements": Announcement.objects.count(),
            "documents": CampusDocument.objects.count(),
            "recent_actions": [
                {
                    "id": event.pk,
                    "actor": event.actor.username if event.actor else "Deleted administrator",
                    "action": event.action,
                    "summary": event.summary,
                    "created_at": event.created_at,
                }
                for event in recent_admin_actions
            ],
        })


class AdminUserListView(APIView):
    permission_classes = [IsSiteSuperuser]
    pagination_class = AdminPagination

    def get(self, request):
        users = User.objects.select_related("department").order_by("username")
        search = (request.query_params.get("search") or "").strip()
        role = (request.query_params.get("role") or "").strip().upper()
        department_id = (request.query_params.get("department") or "").strip()
        level = (request.query_params.get("level") or "").strip()
        active = (request.query_params.get("active") or "").strip().lower()

        if search:
            users = users.filter(
                Q(username__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(matric_number__icontains=search)
            )
        if role in {"STUDENT", "CLASS_REP"}:
            users = users.filter(role=role, is_superuser=False)
        elif role == "SUPER_ADMIN":
            users = users.filter(is_superuser=True)
        if department_id:
            users = users.filter(department_id=department_id)
        if level in LEVELS:
            users = users.filter(level=level)
        if active in {"true", "false"}:
            users = users.filter(is_active=(active == "true"))

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(users, request, view=self)
        return paginator.get_paginated_response([user_data(user) for user in page])


class AdminUserDetailView(APIView):
    permission_classes = [IsSiteSuperuser]

    def patch(self, request, pk):
        try:
            user = User.objects.select_related("department").get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if user.is_superuser:
            return Response(
                {"detail": "Owner accounts cannot be edited from this screen."},
                status=status.HTTP_403_FORBIDDEN,
            )

        changes = {}
        data = request.data

        if "role" in data:
            role = data["role"]
            if role not in {"STUDENT", "CLASS_REP"}:
                return Response(
                    {"role": "Choose Student or Class Representative."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            changes["role"] = role

        if "department" in data:
            department_id = data["department"]
            if department_id in (None, ""):
                changes["department"] = None
            else:
                department = find_department(department_id)
                if not department:
                    return Response(
                        {"department": "Choose an existing department."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                changes["department"] = department

        if "level" in data:
            level = data["level"]
            if level in (None, ""):
                changes["level"] = ""
            elif level in LEVELS:
                changes["level"] = level
            else:
                return Response(
                    {"level": "Choose a valid class level."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if "is_active" in data:
            if not isinstance(data["is_active"], bool):
                return Response(
                    {"is_active": "This field must be true or false."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            changes["is_active"] = data["is_active"]

        for field in ("first_name", "last_name"):
            if field in data:
                changes[field] = str(data[field]).strip()

        if "email" in data:
            email = str(data["email"]).strip().lower()
            if email and User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                return Response(
                    {"email": "A user with that email address already exists."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            changes["email"] = email

        if not changes:
            return Response({"detail": "No supported account changes were provided."}, status=status.HTTP_400_BAD_REQUEST)

        is_student_after = changes.get("role", user.role) == "STUDENT"
        class_scope_changed = (
            ("department" in changes and changes["department"] != user.department)
            or ("level" in changes and changes["level"] != user.level)
        )
        requires_class_code = is_student_after and (
            class_scope_changed or user.role != "STUDENT"
        )
        if requires_class_code:
            changes["registration_completed"] = False

        with transaction.atomic():
            for field, value in changes.items():
                setattr(user, field, value)
            user.save(update_fields=[*changes.keys()])
            log_admin_action(
                request,
                "USER_UPDATED",
                "User",
                user.pk,
                f"Updated account {user.username}: {', '.join(changes.keys())}.",
            )

        user.refresh_from_db()
        return Response({
            "detail": (
                "Account updated. The student must verify the class code again."
                if requires_class_code
                else "Account updated."
            ),
            "user": user_data(user),
        })


class AdminDepartmentListView(APIView):
    permission_classes = [IsSiteSuperuser]

    def get(self, request):
        departments = Department.objects.order_by("name")
        return Response([department_data(department) for department in departments])

    def post(self, request):
        name = str(request.data.get("name") or "").strip()
        faculty = str(request.data.get("faculty") or "").strip()
        if not name or not faculty:
            return Response(
                {"detail": "Department name and faculty are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Department.objects.filter(name__iexact=name).exists():
            return Response(
                {"name": "A department with that name already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        department = Department.objects.create(name=name, faculty=faculty)
        log_admin_action(
            request,
            "DEPARTMENT_CREATED",
            "Department",
            department.pk,
            f"Created department {department.name}.",
        )
        return Response(department_data(department), status=status.HTTP_201_CREATED)


class AdminDepartmentDetailView(APIView):
    permission_classes = [IsSiteSuperuser]

    def patch(self, request, pk):
        try:
            department = Department.objects.get(pk=pk)
        except Department.DoesNotExist:
            return Response({"detail": "Department not found."}, status=status.HTTP_404_NOT_FOUND)

        name = str(request.data.get("name", department.name)).strip()
        faculty = str(request.data.get("faculty", department.faculty)).strip()
        if not name or not faculty:
            return Response(
                {"detail": "Department name and faculty are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Department.objects.filter(name__iexact=name).exclude(pk=pk).exists():
            return Response(
                {"name": "A department with that name already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        department.name = name
        department.faculty = faculty
        department.save(update_fields=["name", "faculty"])
        log_admin_action(
            request,
            "DEPARTMENT_UPDATED",
            "Department",
            department.pk,
            f"Updated department {department.name}.",
        )
        return Response(department_data(department))

    def delete(self, request, pk):
        try:
            department = Department.objects.get(pk=pk)
        except Department.DoesNotExist:
            return Response({"detail": "Department not found."}, status=status.HTTP_404_NOT_FOUND)

        references = {
            "users": User.objects.filter(department=department).count(),
            "class_codes": ClassCode.objects.filter(department=department).count(),
            "sessions": LectureSession.objects.filter(department=department).count(),
            "announcements": Announcement.objects.filter(department=department).count(),
            "documents": CampusDocument.objects.filter(department=department).count(),
        }
        if any(references.values()):
            return Response(
                {
                    "detail": "This department still has linked records. Reassign or remove those records before deleting it.",
                    "references": references,
                },
                status=status.HTTP_409_CONFLICT,
            )

        name = department.name
        department.delete()
        log_admin_action(
            request,
            "DEPARTMENT_DELETED",
            "Department",
            pk,
            f"Deleted empty department {name}.",
        )
        return Response({"detail": "Empty department deleted."})


class AdminClassCodeListView(APIView):
    permission_classes = [IsSiteSuperuser]

    def get(self, request):
        codes = ClassCode.objects.select_related("department").order_by(
            "department__name", "level"
        )
        return Response([
            {
                "id": code.pk,
                "department": code.department_id,
                "department_name": code.department.name,
                "level": code.level,
                "code": code.code,
            }
            for code in codes
        ])

    def post(self, request):
        department = find_department(request.data.get("department"))
        level = request.data.get("level")
        if not department or level not in LEVELS:
            return Response(
                {"detail": "Choose an existing department and a valid level."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        code, created = ClassCode.objects.get_or_create(
            department=department,
            level=level,
        )
        if created:
            log_admin_action(
                request,
                "CLASS_CODE_CREATED",
                "ClassCode",
                code.pk,
                f"Created a class code for {department.name}, {level} level.",
            )
        return Response(
            {
                "id": code.pk,
                "department": code.department_id,
                "department_name": code.department.name,
                "level": code.level,
                "code": code.code,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class AdminClassCodeRotateView(APIView):
    permission_classes = [IsSiteSuperuser]

    def post(self, request, pk):
        try:
            code = ClassCode.objects.select_related("department").get(pk=pk)
        except ClassCode.DoesNotExist:
            return Response({"detail": "Class code not found."}, status=status.HTTP_404_NOT_FOUND)
        from attendance.models import generate_class_code

        code.code = generate_class_code()
        code.save(update_fields=["code"])
        log_admin_action(
            request,
            "CLASS_CODE_ROTATED",
            "ClassCode",
            code.pk,
            f"Regenerated the class code for {code.department.name}, {code.level} level.",
        )
        return Response({"id": code.pk, "code": code.code})


class AdminSessionListView(APIView):
    permission_classes = [IsSiteSuperuser]

    def get(self, request):
        sessions = (
            LectureSession.objects.select_related("department")
            .annotate(attendee_count=Count("attendancerecord"))
            .order_by("-created_at")
        )
        return Response([session_data(session) for session in sessions])

    def patch(self, request, pk):
        try:
            session = LectureSession.objects.select_related("department").get(pk=pk)
        except LectureSession.DoesNotExist:
            return Response({"detail": "Session not found."}, status=status.HTTP_404_NOT_FOUND)
        if request.data.get("action") != "end":
            return Response(
                {"detail": "The supported session action is 'end'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not session.has_ended:
            session.is_active = False
            session.has_ended = True
            session.save(update_fields=["is_active", "has_ended"])
            log_admin_action(
                request,
                "SESSION_ENDED",
                "LectureSession",
                session.pk,
                f"Ended {session.course_code} in {session.department.name}, {session.level} level.",
            )
        return Response({"detail": "Session ended.", "session": session_data(session)})


class AdminAnnouncementListView(APIView):
    permission_classes = [IsSiteSuperuser]

    def get(self, request):
        announcements = Announcement.objects.select_related(
            "department", "posted_by"
        ).order_by("-created_at")
        return Response([announcement_data(item) for item in announcements])


class AdminAnnouncementDetailView(APIView):
    permission_classes = [IsSiteSuperuser]

    def patch(self, request, pk):
        try:
            announcement = Announcement.objects.select_related(
                "department", "posted_by"
            ).get(pk=pk)
        except Announcement.DoesNotExist:
            return Response({"detail": "Announcement not found."}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if "title" in data:
            announcement.title = str(data["title"]).strip()
        if "body" in data:
            announcement.body = str(data["body"]).strip()
        if "category" in data:
            allowed_categories = {value for value, _label in Announcement.CATEGORY_CHOICES}
            if data["category"] not in allowed_categories:
                return Response({"category": "Choose a valid announcement category."}, status=status.HTTP_400_BAD_REQUEST)
            announcement.category = data["category"]
        if "department" in data:
            department = find_department(data["department"])
            if not department:
                return Response({"department": "Choose an existing department."}, status=status.HTTP_400_BAD_REQUEST)
            announcement.department = department
        if "level" in data:
            if data["level"] not in LEVELS:
                return Response({"level": "Choose a valid class level."}, status=status.HTTP_400_BAD_REQUEST)
            announcement.level = data["level"]
        if "due_date" in data:
            raw_due_date = data["due_date"]
            if raw_due_date and not isinstance(raw_due_date, str):
                return Response({"due_date": "Enter a valid date."}, status=status.HTTP_400_BAD_REQUEST)
            due_date = parse_date(raw_due_date) if raw_due_date else None
            if raw_due_date and not due_date:
                return Response({"due_date": "Enter a valid date."}, status=status.HTTP_400_BAD_REQUEST)
            announcement.due_date = due_date

        if not announcement.title or not announcement.body:
            return Response(
                {"detail": "Announcement title and body are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        announcement.save()
        log_admin_action(
            request,
            "ANNOUNCEMENT_UPDATED",
            "Announcement",
            announcement.pk,
            f"Updated announcement {announcement.title}.",
        )
        return Response(announcement_data(announcement))

    def delete(self, request, pk):
        try:
            announcement = Announcement.objects.get(pk=pk)
        except Announcement.DoesNotExist:
            return Response({"detail": "Announcement not found."}, status=status.HTTP_404_NOT_FOUND)
        title = announcement.title
        announcement.delete()
        log_admin_action(
            request,
            "ANNOUNCEMENT_DELETED",
            "Announcement",
            pk,
            f"Deleted announcement {title}.",
        )
        return Response({"detail": "Announcement deleted."})


class AdminDocumentListView(APIView):
    permission_classes = [IsSiteSuperuser]

    def get(self, request):
        documents = CampusDocument.objects.select_related(
            "department", "uploaded_by"
        ).order_by("-created_at")
        return Response([document_data(document) for document in documents])


class AdminDocumentDetailView(APIView):
    permission_classes = [IsSiteSuperuser]

    def delete(self, request, pk):
        try:
            document = CampusDocument.objects.select_related("department").get(pk=pk)
        except CampusDocument.DoesNotExist:
            return Response({"detail": "Document not found."}, status=status.HTTP_404_NOT_FOUND)

        title = document.title
        document.file.delete(save=False)
        document.delete()
        log_admin_action(
            request,
            "DOCUMENT_DELETED",
            "CampusDocument",
            pk,
            f"Deleted document {title}.",
        )
        return Response({"detail": "Document deleted."})


class AdminAuditView(APIView):
    permission_classes = [IsSiteSuperuser]

    def get(self, request):
        admin_events = AdminAuditEvent.objects.select_related("actor")[:100]
        rep_events = AuditLog.objects.select_related("rep")[:100]
        events = [
            {
                "id": f"admin-{event.pk}",
                "type": "ADMIN",
                "actor": event.actor.username if event.actor else "Deleted administrator",
                "action": event.action,
                "summary": event.summary,
                "created_at": event.created_at,
            }
            for event in admin_events
        ]
        events.extend(
            {
                "id": f"rep-{event.pk}",
                "type": "CLASS_REP",
                "actor": event.rep.username,
                "action": event.action,
                "summary": f"{event.course_code} at {event.venue_name}",
                "created_at": event.timestamp,
            }
            for event in rep_events
        )
        events.sort(key=lambda event: event["created_at"], reverse=True)
        return Response(events[:100])
