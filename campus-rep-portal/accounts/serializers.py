from django.utils import timezone
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Department, LecturerTeachingAssignment, User


class TeachingAssignmentInputSerializer(serializers.Serializer):
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all())
    level = serializers.ChoiceField(choices=User.LEVELS)


class LecturerTeachingAssignmentSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = LecturerTeachingAssignment
        fields = ["id", "department", "department_name", "level"]
        read_only_fields = fields


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    terms_accepted = serializers.BooleanField(write_only=True, required=True)
    role = serializers.ChoiceField(
        choices=[("STUDENT", "Student"), ("LECTURER", "Lecturer")],
        default="STUDENT",
    )
    teaching_assignments = TeachingAssignmentInputSerializer(
        many=True,
        required=False,
        write_only=True,
    )

    class Meta:
        model = User
        fields = [
            'username', 'first_name', 'last_name', 'email', 'password',
            'role', 'department', 'level', 'teaching_assignments',
            'terms_accepted'
        ]

    def validate(self, attrs):
        if not attrs.get('terms_accepted'):
            raise serializers.ValidationError({'terms_accepted': 'You must accept the Terms & Conditions.'})

        role = attrs.get("role", "STUDENT")
        if role == "STUDENT":
            if not attrs.get("department") or not attrs.get("level"):
                raise serializers.ValidationError(
                    {"department": "Department and level are required."}
                )
        else:
            assignments = attrs.get("teaching_assignments") or []
            if not assignments:
                raise serializers.ValidationError(
                    {
                        "teaching_assignments": (
                            "Select at least one department and level you teach."
                        )
                    }
                )
            pairs = [(item["department"].pk, item["level"]) for item in assignments]
            if len(pairs) != len(set(pairs)):
                raise serializers.ValidationError(
                    {"teaching_assignments": "Remove duplicate department and level selections."}
                )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop('terms_accepted', None)
        assignments = validated_data.pop("teaching_assignments", [])
        role = validated_data.get("role", "STUDENT")
        validated_data['terms_accepted_at'] = timezone.now()
        if role == "LECTURER":
            first_assignment = assignments[0]
            validated_data["department"] = first_assignment["department"]
            validated_data["level"] = first_assignment["level"]
            validated_data["lecturer_approved"] = False
            validated_data["is_active"] = False

        user = User.objects.create_user(**validated_data)
        if role == "LECTURER":
            LecturerTeachingAssignment.objects.bulk_create(
                [
                    LecturerTeachingAssignment(
                        lecturer=user,
                        department=assignment["department"],
                        level=assignment["level"],
                    )
                    for assignment in assignments
                ]
            )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    faculty = serializers.CharField(source='department.faculty', read_only=True, allow_null=True)
    role_label = serializers.CharField(source='get_role_display', read_only=True)
    level_label = serializers.CharField(source='get_level_display', read_only=True)
    teaching_assignments = LecturerTeachingAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'phone_number',
            'role', 'role_label', 'department', 'department_name', 'faculty',
            'level', 'level_label', 'matric_number', 'profile_picture', 'terms_accepted_at',
            'registration_completed', 'lecturer_approved', 'teaching_assignments',
        ]
        read_only_fields = [
            'id', 'username', 'email', 'role', 'role_label', 'department',
            'department_name', 'faculty', 'terms_accepted_at',
            'lecturer_approved', 'teaching_assignments',
        ]

    def validate_profile_picture(self, value):
        if value and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('Profile picture must be 5 MB or smaller.')
        content_type = getattr(value, 'content_type', '')
        if content_type and content_type not in {'image/jpeg', 'image/png', 'image/webp'}:
            raise serializers.ValidationError('Use a JPG, PNG or WebP image.')
        return value


class StudentClassmateSerializer(serializers.ModelSerializer):
    """Minimal, privacy-safe details for students viewing classmates."""
    role_label = serializers.CharField(source='get_role_display', read_only=True)
    level_label = serializers.CharField(source='get_level_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name',
            'profile_picture', 'role', 'role_label',
            'level', 'level_label',
        ]
        read_only_fields = fields


class RepClassmateSerializer(serializers.ModelSerializer):
    """Full student details accessible exclusively by Course Representatives."""
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    role_label = serializers.CharField(source='get_role_display', read_only=True)
    level_label = serializers.CharField(source='get_level_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'phone_number', 'matric_number',
            'profile_picture', 'role', 'role_label',
            'department_name', 'level', 'level_label', 'is_active', 'date_joined',
        ]
        read_only_fields = fields


class PreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'push_notifications', 'email_notifications',
            'session_notifications', 'announcement_notifications',
        ]


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = 'SUPER_ADMIN' if user.is_superuser else user.role
        token['username'] = user.username
        return token
