import logging
import traceback
from datetime import timedelta
from urllib.parse import urlparse

from django.conf import settings
from django.contrib.auth import password_validation
from django.contrib.auth.hashers import check_password
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.utils import timezone
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    AuthenticatorAttachment,
    AuthenticatorSelectionCriteria,
    ResidentKeyRequirement,
    UserVerificationRequirement,
    PublicKeyCredentialDescriptor,
)
from webauthn.helpers.exceptions import WebAuthnException
from webauthn.helpers import base64url_to_bytes
from attendance.models import ClassCode
from .email import (
    PasswordResetEmailError,
    password_reset_email_is_configured,
    send_password_reset_email,
)
from .models import (
    AttendancePasskeyGrant,
    Department,
    PasskeyChallenge,
    PasskeyCredential,
    PushSubscription,
    User,
)
from .push import send_push_to_user
from .serializers import (
    MyTokenObtainPairSerializer, PreferencesSerializer, SignupSerializer,
    UserProfileSerializer, StudentClassmateSerializer, RepClassmateSerializer,
)

logger = logging.getLogger(__name__)


class DepartmentListView(generics.ListAPIView):
    queryset = Department.objects.all().order_by('name')
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    class DeptSerializer(serializers.ModelSerializer):
        class Meta:
            model = Department
            fields = ['id', 'name', 'faculty']

    serializer_class = DeptSerializer


class MyProfileView(generics.RetrieveUpdateDestroyAPIView):
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

        if user.role == 'STUDENT':
            if not matric_number or not phone_number or not class_code:
                return Response(
                    {'detail': 'Matric number, WhatsApp number, and class representative code are required to complete registration.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            selected_level = level or user.level
            expected_code = ClassCode.objects.filter(
                department=user.department, level=selected_level
            ).first()
            if not expected_code or expected_code.code.upper() != class_code:
                return Response({'detail': 'Invalid class code for the selected level.'}, status=status.HTTP_400_BAD_REQUEST)

            user.matric_number = matric_number
            user.phone_number = phone_number
            user.level = selected_level
            user.registration_completed = True
        else:
            if matric_number:
                user.matric_number = matric_number
            if phone_number:
                user.phone_number = phone_number
            if level:
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
            'registration_completed': user.registration_completed,
        })


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class SignupView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = SignupSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []


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
    authentication_classes = []

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

        if settings.DEBUG and not password_reset_email_is_configured():
            generic['reset_url'] = reset_url
            return Response(generic)

        try:
            send_password_reset_email(user.email, reset_url)
        except PasswordResetEmailError:
            logger.exception("Unable to send password reset email.")
            return Response(
                {'detail': 'Password reset email is temporarily unavailable. Please try again later.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(generic)


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

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


class ClassmatesView(generics.ListAPIView):
    """Return classmates in the same department and level.
    Course Reps receive full details; students receive minimal safe profiles."""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.user.role == 'CLASS_REP':
            return RepClassmateSerializer
        return StudentClassmateSerializer

    def get_queryset(self):
        user = self.request.user
        qs = User.objects.filter(
            department=user.department,
            level=user.level,
        ).exclude(pk=user.pk).order_by('first_name', 'last_name', 'username')
        search = self.request.query_params.get('search', '').strip()
        if search:
            from django.db.models import Q
            if user.role == 'CLASS_REP':
                qs = qs.filter(
                    Q(first_name__icontains=search) |
                    Q(last_name__icontains=search) |
                    Q(username__icontains=search) |
                    Q(matric_number__icontains=search) |
                    Q(email__icontains=search)
                )
            else:
                qs = qs.filter(
                    Q(first_name__icontains=search) |
                    Q(last_name__icontains=search) |
                    Q(username__icontains=search)
                )
        return qs


class ToggleSuspendStudentView(APIView):
    """Allows a Course Representative to suspend or unsuspend a student in their department and level."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        if request.user.role != 'CLASS_REP':
            return Response({'detail': 'Only Course Representatives can manage student account statuses.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            student = User.objects.get(
                pk=pk,
                role='STUDENT',
                department=request.user.department,
                level=request.user.level
            )
        except User.DoesNotExist:
            return Response({'detail': 'Student not found in your class.'}, status=status.HTTP_404_NOT_FOUND)

        student.is_active = not student.is_active
        student.save(update_fields=['is_active'])
        status_text = 'active' if student.is_active else 'suspended'
        return Response({
            'detail': f"Account for {student.get_full_name() or student.username} is now {status_text}.",
            'id': student.pk,
            'is_active': student.is_active,
        })


class DeleteStudentAccountView(APIView):
    """Allows a Course Representative to delete a mistakenly created student account in their department and level."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        if request.user.role != 'CLASS_REP':
            return Response({'detail': 'Only Course Representatives can delete mistakenly created student accounts.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            student = User.objects.get(
                pk=pk,
                role='STUDENT',
                department=request.user.department,
                level=request.user.level
            )
        except User.DoesNotExist:
            return Response({'detail': 'Student not found in your class.'}, status=status.HTTP_404_NOT_FOUND)

        student_name = student.get_full_name() or student.username
        student.delete()
        return Response({'detail': f"Account '{student_name}' was deleted successfully."})


def get_allowed_webauthn_origins(request=None):
    origins = set()
    configured_origin = getattr(settings, "WEBAUTHN_ORIGIN", None)
    if configured_origin:
        origins.add(configured_origin.rstrip("/"))

    for origin in getattr(settings, "CORS_ALLOWED_ORIGINS", []):
        if origin:
            origins.add(origin.rstrip("/"))

    origins.update({
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    })

    if request:
        request_origin = request.headers.get("Origin")
        if request_origin:
            clean_origin = request_origin.rstrip("/")
            parsed = urlparse(clean_origin)
            hostname = parsed.hostname or ""
            if (
                hostname in {"localhost", "127.0.0.1"}
                or hostname.endswith(".netlify.app")
                or hostname.startswith("192.168.")
                or hostname.startswith("10.")
            ):
                origins.add(clean_origin)

    return list(origins)


def get_webauthn_rp_id(request=None):
    configured_rp_id = getattr(settings, "WEBAUTHN_RP_ID", None)
    if configured_rp_id:
        return configured_rp_id.rstrip(".").lower()

    if request:
        request_origin = request.headers.get("Origin")
        if request_origin:
            hostname = urlparse(request_origin).hostname
            if hostname:
                return hostname
    return "localhost"


class PasskeyRegistrationOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        try:
            existing_credentials = PasskeyCredential.objects.filter(
                user=user,
            )
            if existing_credentials.exists():
                return Response(
                    {"detail": "Only one passkey can be registered per account. Contact an administrator to replace it."},
                    status=status.HTTP_409_CONFLICT,
                )
            options = generate_registration_options(
                rp_id=get_webauthn_rp_id(request),
                rp_name=settings.WEBAUTHN_RP_NAME,
                user_id=str(user.id).encode("utf-8"),
                user_name=user.username,
                user_display_name=user.get_full_name() or user.username,
                authenticator_attachment=AuthenticatorAttachment.PLATFORM,
                authenticator_selection=AuthenticatorSelectionCriteria(
                    resident_key=ResidentKeyRequirement.PREFERRED,
                    user_verification=UserVerificationRequirement.PREFERRED,
                ),
                exclude_credentials=[
                    PublicKeyCredentialDescriptor(
                        id=bytes(credential.credential_id),
                        transports=[],
                    )
                    for credential in existing_credentials
                ],
            )
            challenge = PasskeyChallenge.objects.create(
                user=user,
                challenge=options.challenge,
                challenge_type="REGISTRATION",
                expires_at=timezone.now() + timedelta(minutes=5),
            )
            return Response({
                "options": options_to_json(options),
                "challenge_id": challenge.id,
            })
        except Exception as exc:
            logger.exception("Passkey registration options failed.")
            return Response(
                {
                    "detail": "Passkey registration options failed.",
                    "error": str(exc),
                    "error_type": type(exc).__name__,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PasskeyRegistrationVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        credential = request.data.get("credential")
        challenge_id = request.data.get("challenge_id")
        if not credential:
            return Response({"detail": "Passkey credential is required."}, status=400)
        if not challenge_id:
            return Response({"detail": "Registration challenge is required."}, status=400)

        try:
            challenge = PasskeyChallenge.objects.get(
                id=challenge_id,
                user=user,
                challenge_type="REGISTRATION",
                used=False,
            )
        except PasskeyChallenge.DoesNotExist:
            return Response({"detail": "Invalid or expired registration challenge."}, status=400)

        if challenge.expires_at < timezone.now():
            challenge.used = True
            challenge.save(update_fields=["used"])
            return Response({"detail": "Registration challenge has expired."}, status=400)

        try:
            verification = verify_registration_response(
                credential=credential,
                expected_challenge=bytes(challenge.challenge),
                expected_origin=get_allowed_webauthn_origins(request),
                expected_rp_id=get_webauthn_rp_id(request),
                require_user_verification=False,
            )
        except WebAuthnException as exc:
            logger.warning("Passkey registration verification failed: %s", exc)
            return Response(
                {"detail": f"Device verification failed: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            User.objects.select_for_update().get(pk=user.pk)
            if PasskeyCredential.objects.filter(user=user).exists():
                return Response(
                    {"detail": "Only one passkey can be registered per account. Contact an administrator to replace it."},
                    status=status.HTTP_409_CONFLICT,
                )
            if PasskeyCredential.objects.filter(
                credential_id=verification.credential_id
            ).exists():
                return Response({"detail": "This passkey is already registered."}, status=400)

            challenge.used = True
            challenge.save(update_fields=["used"])
            device_type = getattr(verification, "credential_device_type", None)
            PasskeyCredential.objects.create(
                user=user,
                credential_id=verification.credential_id,
                public_key=verification.credential_public_key,
                sign_count=verification.sign_count,
                device_type=device_type.value if device_type else "platform",
                backed_up=bool(getattr(verification, "credential_backed_up", False)),
                device_name=request.data.get("device_name", "My device"),
            )
        return Response({"detail": "Passkey registered successfully."}, status=201)


class PasskeyAuthenticationOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        session_id = request.data.get("session_id")
        if not session_id:
            return Response({"detail": "Lecture session is required."}, status=400)

        credentials = PasskeyCredential.objects.filter(user=user, is_active=True)
        if not credentials.exists():
            return Response(
                {
                    "detail": (
                        "No passkey is registered for this account. "
                        "Please set up a passkey in Security settings before marking attendance."
                    ),
                    "no_passkey": True,
                },
                status=400,
            )

        PasskeyChallenge.objects.filter(
            user=user,
            challenge_type="AUTHENTICATION",
            used=False,
            expires_at__lt=timezone.now(),
        ).update(used=True)
        options = generate_authentication_options(
            rp_id=get_webauthn_rp_id(request),
            user_verification=UserVerificationRequirement.PREFERRED,
            allow_credentials=[
                PublicKeyCredentialDescriptor(
                    id=bytes(credential.credential_id),
                    transports=[],
                )
                for credential in credentials
            ],
        )
        challenge = PasskeyChallenge.objects.create(
            user=user,
            challenge=options.challenge,
            challenge_type="AUTHENTICATION",
            session_id=int(session_id),
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        return Response({
            "options": options_to_json(options),
            "challenge_id": challenge.id,
        })


class PasskeyAuthenticationVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        credential = request.data.get("credential")
        challenge_id = request.data.get("challenge_id")
        if not credential:
            return Response({"detail": "Passkey credential is required."}, status=400)
        if not challenge_id:
            return Response({"detail": "Authentication challenge is required."}, status=400)

        try:
            challenge = PasskeyChallenge.objects.get(
                id=challenge_id,
                user=user,
                challenge_type="AUTHENTICATION",
                used=False,
            )
        except PasskeyChallenge.DoesNotExist:
            return Response({"detail": "Invalid or expired authentication challenge."}, status=400)

        if challenge.expires_at < timezone.now():
            challenge.used = True
            challenge.save(update_fields=["used"])
            return Response({"detail": "Authentication challenge has expired."}, status=400)

        credential_id = credential.get("id") or credential.get("rawId")
        if not credential_id:
            return Response({"detail": "Passkey credential ID is missing."}, status=400)
        try:
            credential_id_bytes = base64url_to_bytes(credential_id)
        except Exception:
            return Response({"detail": "Invalid passkey credential ID."}, status=400)

        try:
            passkey = PasskeyCredential.objects.get(
                user=user,
                credential_id=credential_id_bytes,
                is_active=True,
            )
        except PasskeyCredential.DoesNotExist:
            return Response({"detail": "This passkey is not registered to your account."}, status=400)

        try:
            verification = verify_authentication_response(
                credential=credential,
                expected_challenge=bytes(challenge.challenge),
                expected_origin=get_allowed_webauthn_origins(request),
                expected_rp_id=get_webauthn_rp_id(request),
                credential_public_key=bytes(passkey.public_key),
                credential_current_sign_count=passkey.sign_count,
                require_user_verification=False,
            )
        except WebAuthnException as exc:
            logger.warning("Passkey authentication verification failed: %s", exc)
            return Response({"detail": f"Device verification failed: {exc}"}, status=400)

        challenge.used = True
        challenge.save(update_fields=["used"])
        passkey.sign_count = verification.new_sign_count
        passkey.last_used_at = timezone.now()
        device_type = getattr(verification, "credential_device_type", None)
        if device_type:
            passkey.device_type = device_type.value
        passkey.backed_up = bool(getattr(verification, "credential_backed_up", False))
        passkey.save(update_fields=["sign_count", "last_used_at", "device_type", "backed_up"])
        grant = AttendancePasskeyGrant.objects.create(
            user=user,
            session_id=challenge.session_id,
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        return Response({
            "detail": "Passkey verification successful.",
            "verified": True,
            "attendance_grant": str(grant.token),
        })


class PasskeyStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        passkeys = PasskeyCredential.objects.filter(
            user=request.user,
            is_active=True,
        ).order_by("-created_at")
        return Response({
            "has_passkey": passkeys.exists(),
            "passkeys": [
                {
                    "id": passkey.id,
                    "device_name": passkey.device_name or "Registered passkey",
                    "device_type": passkey.device_type,
                    "created_at": passkey.created_at,
                    "last_used_at": passkey.last_used_at,
                }
                for passkey in passkeys
            ],
        })
