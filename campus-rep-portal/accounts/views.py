from rest_framework import generics, permissions
from .models import User
from rest_framework import serializers
from .serializers import SignupSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import MyTokenObtainPairSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Department
from .serializers import SignupSerializer
from django.contrib.auth.hashers import check_password


class DepartmentListView(generics.ListAPIView):
    queryset = Department.objects.all()
    permission_classes = [permissions.AllowAny]

    class DeptSerializer(serializers.ModelSerializer):
        class Meta:
            model = Department
            fields = ['id', 'name']

    serializer_class = DeptSerializer

class UpdateMatricView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        matric_number = request.data.get('matric_number')
        level = request.data.get('level')
        class_code = request.data.get('class_code')
        phone_number = request.data.get('phone_number')

        if matric_number:
            request.user.matric_number = matric_number

        if phone_number:
            request.user.phone_number = phone_number

        if level and str(level) != str(request.user.level):
            # Level is changing — require a valid class code for the new level
            code = (class_code or '').strip().upper()
            expected_code = ClassCode.objects.filter(
                department=request.user.department,
                level=level
            ).first()

            if not expected_code or expected_code.code.upper() != code:
                return Response(
                    {"detail": "Invalid class code for the selected level."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            request.user.level = level

        request.user.save()
        return Response({
            "detail": "Profile updated.",
            "matric_number": request.user.matric_number,
            "level": request.user.level
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
            return Response({"detail": "Both current and new password are required."}, status=status.HTTP_400_BAD_REQUEST)

        if not check_password(current_password, request.user.password):
            return Response({"detail": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save()
        return Response({"detail": "Password updated successfully."})

from .models import PushSubscription
from pywebpush import webpush, WebPushException
from django.conf import settings
import json


class SaveSubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        data = request.data
        PushSubscription.objects.update_or_create(
            user=request.user,
            endpoint=data.get('endpoint'),
            defaults={
                'p256dh': data.get('keys', {}).get('p256dh'),
                'auth': data.get('keys', {}).get('auth'),
            }
        )
        return Response({"detail": "Subscribed to notifications."})


def send_push_to_user(user, title, body):
    subscriptions = PushSubscription.objects.filter(user=user)
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth}
                },
                data=json.dumps({"title": title, "body": body}),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": "mailto:admin@campuspulse.com"}
            )
        except WebPushException:
            sub.delete()