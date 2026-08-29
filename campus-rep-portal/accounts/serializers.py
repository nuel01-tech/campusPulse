from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from attendance.models import ClassCode
from .models import User


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    class_code = serializers.CharField(write_only=True, required=True, trim_whitespace=True)
    terms_accepted = serializers.BooleanField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            'username', 'first_name', 'last_name', 'email', 'password',
            'department', 'level', 'phone_number', 'class_code', 'terms_accepted'
        ]

    def validate(self, attrs):
        department = attrs.get('department')
        level = attrs.get('level')
        class_code = (attrs.get('class_code') or '').strip().upper()

        if not department or not level:
            raise serializers.ValidationError({'department': 'Department and level are required.'})
        if not attrs.get('terms_accepted'):
            raise serializers.ValidationError({'terms_accepted': 'You must accept the Terms & Conditions.'})

        expected_code = ClassCode.objects.filter(department=department, level=level).first()
        if not expected_code or expected_code.code.upper() != class_code:
            raise serializers.ValidationError({'class_code': 'Invalid class code for the selected department and level.'})

        attrs['class_code'] = class_code
        return attrs

    def create(self, validated_data):
        validated_data.pop('class_code', None)
        validated_data.pop('terms_accepted', None)
        validated_data['terms_accepted_at'] = timezone.now()
        return User.objects.create_user(**validated_data)


class UserProfileSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    faculty = serializers.CharField(source='department.faculty', read_only=True, allow_null=True)
    role_label = serializers.CharField(source='get_role_display', read_only=True)
    level_label = serializers.CharField(source='get_level_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'phone_number',
            'role', 'role_label', 'department', 'department_name', 'faculty',
            'level', 'level_label', 'matric_number', 'profile_picture', 'terms_accepted_at'
        ]
        read_only_fields = [
            'id', 'username', 'email', 'role', 'role_label', 'department',
            'department_name', 'faculty', 'terms_accepted_at'
        ]

    def validate_profile_picture(self, value):
        if value and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('Profile picture must be 5 MB or smaller.')
        content_type = getattr(value, 'content_type', '')
        if content_type and content_type not in {'image/jpeg', 'image/png', 'image/webp'}:
            raise serializers.ValidationError('Use a JPG, PNG or WebP image.')
        return value


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
        token['role'] = user.role
        token['username'] = user.username
        return token
