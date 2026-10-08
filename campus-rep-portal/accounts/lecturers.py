from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LecturerTeachingAssignment, User


class LecturerDirectoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in {"STUDENT", "CLASS_REP"}:
            return Response(
                {"detail": "The lecturer directory is available to students and class representatives."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not request.user.department or not request.user.level:
            return Response([])

        assignments = (
            LecturerTeachingAssignment.objects.filter(
                department=request.user.department,
                level=request.user.level,
                lecturer__role="LECTURER",
                lecturer__lecturer_approved=True,
                lecturer__is_active=True,
            )
            .select_related("lecturer", "department")
            .order_by("lecturer__last_name", "lecturer__first_name", "lecturer__username")
        )

        results = []
        seen_lecturers = set()
        for assignment in assignments:
            lecturer = assignment.lecturer
            if lecturer.pk in seen_lecturers:
                continue
            seen_lecturers.add(lecturer.pk)
            results.append({
                "id": lecturer.pk,
                "first_name": lecturer.first_name,
                "last_name": lecturer.last_name,
                "display_name": lecturer.get_full_name() or lecturer.username,
                "department": assignment.department.name,
                "level": assignment.level,
            })
        return Response(results)


class LecturerAssignmentListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "LECTURER" or not request.user.lecturer_approved:
            return Response(
                {"detail": "Approved lecturer access is required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        assignments = request.user.teaching_assignments.select_related(
            "department"
        ).order_by("department__name", "level")
        return Response([
            {
                "id": assignment.pk,
                "department": assignment.department_id,
                "department_name": assignment.department.name,
                "level": assignment.level,
            }
            for assignment in assignments
        ])
