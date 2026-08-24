from rest_framework import serializers
from .models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from attendance.models import ClassCode


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class_code = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email', 'password', 'department', 'level', 'phone_number', 'class_code']

    def validate(self, attrs):
        department = attrs.get('department')
        level = attrs.get('level')
        class_code = (attrs.get('class_code') or '').strip().upper()

        if not department or not level:
            raise serializers.ValidationError({'department': 'Department and level are required.'})

        expected_code = ClassCode.objects.filter(department=department, level=level).first()
        if not expected_code or expected_code.code.upper() != class_code:
            raise serializers.ValidationError({'class_code': 'Invalid class code for the selected department and level.'})

        attrs['class_code'] = class_code
        return attrs

    def create(self, validated_data):
        validated_data.pop('class_code', None)
        user = User.objects.create_user(**validated_data)
        return user

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['username'] = user.username
        return token