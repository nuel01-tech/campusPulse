from django.conf import settings
from django.contrib.auth import password_validation
from django.contrib.auth.hashers import check_password
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from attendance.models import ClassCode
from .models import Department, PushSubscription, User
from .push import send_push_to_user
from .serializers import (
    MyTokenObtainPairSerializer, PreferencesSerializer, SignupSerializer,
    UserProfileSerializer,
)


class DepartmentListView(generics.ListAPIView):
    queryset = Department.objects.all().order_by('name')
    permission_classes = [permissions.AllowAny]

    class DeptSerializer(serializers.ModelSerializer):
        class Meta:
            model = Department
            fields = ['id', 'name', 'faculty']

    serializer_class = DeptSerializer


class MyProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        # Usernames are account identifiers in CampusPulse and cannot be changed.
        if 'username' in request.data and request.data.get('username') != request.user.username:
            return Response({'username': 'Username cannot be changed after account creation.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)


class PreferencesView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PreferencesSerializer

    def get_object(self):
        return self.request.user


class UpdateMatricView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        user = request.user
        matric_number = (request.data.get('matric_number') or '').strip()
        level = request.data.get('level')
        class_code = (request.data.get('class_code') or '').strip().upper()
        phone_number = (request.data.get('phone_number') or '').strip()

        if matric_number:
            user.matric_number = matric_number
        if phone_number:
            user.phone_number = phone_number

        if level and str(level) != str(user.level):
            expected_code = ClassCode.objects.filter(department=user.department, level=level).first()
            if not expected_code or expected_code.code.upper() != class_code:
                return Response({'detail': 'Invalid class code for the selected level.'}, status=status.HTTP_400_BAD_REQUEST)
            user.level = level

        try:
            user.full_clean(exclude=['password'])
            user.save()
        except Exception as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'detail': 'Profile updated.',
            'matric_number': user.matric_number,
            'level': user.level,
            'phone_number': user.phone_number,
        })


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class SignupView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = SignupSerializer
    permission_classes = [permissions.AllowAny]


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not current_password or not new_password:
            return Response({'detail': 'Both current and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not check_password(current_password, request.user.password):
            return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            password_validation.validate_password(new_password, request.user)
        except Exception as exc:
            return Response({'detail': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Password updated successfully.'})


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        username = (request.data.get('username') or '').strip()
        email = (request.data.get('email') or '').strip().lower()
        class_code = (request.data.get('class_code') or '').strip().upper()
        generic = {'detail': 'If the account details are valid, a password reset link has been sent.'}

        user = User.objects.filter(username__iexact=username, email__iexact=email).select_related('department').first()
        if not user or not user.department or not user.level:
            return Response(generic)

        expected = ClassCode.objects.filter(department=user.department, level=user.level).first()
        if not expected or expected.code.upper() != class_code:
            return Response(generic)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
        reset_url = f'{frontend_url}/reset-password/{uid}/{token}'

        send_mail(
            'Reset your CampusPulse password',
            f'Use this link to reset your CampusPulse password:\n\n{reset_url}\n\nThis link expires when your password is changed or the token becomes invalid.',
            getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@campuspulse.app'),
            [user.email],
            fail_silently=True,
        )

        if settings.DEBUG:
            generic['reset_url'] = reset_url
        return Response(generic)


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.utils.http import urlsafe_base64_decode
        from django.contrib.auth import get_user_model

        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        if not uidb64 or not token or not new_password:
            return Response({'detail': 'Reset token and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = get_user_model().objects.get(pk=uid)
        except Exception:
            return Response({'detail': 'This reset link is invalid or expired.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'This reset link is invalid or expired.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            password_validation.validate_password(new_password, user)
        except Exception as exc:
            return Response({'detail': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Password reset successfully. You can now sign in.'})


class SaveSubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        data = request.data
        endpoint = data.get('endpoint')
        keys = data.get('keys') or {}
        if not endpoint or not keys.get('p256dh') or not keys.get('auth'):
            return Response({'detail': 'Invalid push subscription.'}, status=status.HTTP_400_BAD_REQUEST)
        PushSubscription.objects.update_or_create(
            user=request.user, endpoint=endpoint,
            defaults={'p256dh': keys.get('p256dh'), 'auth': keys.get('auth')},
        )
        return Response({'detail': 'Subscribed to notifications.'})

