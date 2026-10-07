from django.conf import settings
from django.contrib.auth import password_validation
from django.contrib.auth.hashers import check_password
from django.contrib.auth.tokens import default_token_generator
from decouple import config
from django.db import transaction
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from attendance.models import ClassCode
from accounts.models import AttendancePasskeyGrant
from .models import Department, PushSubscription, User
from .push import send_push_to_user
import traceback
from .serializers import (
    MyTokenObtainPairSerializer, PreferencesSerializer, SignupSerializer,
    UserProfileSerializer, StudentClassmateSerializer, RepClassmateSerializer,
)
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

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
)

from webauthn.helpers.exceptions import WebAuthnException
from webauthn.helpers.structs import PublicKeyCredentialDescriptor
from .models import (
    PasskeyCredential,
    PasskeyChallenge,
    AttendancePasskeyGrant,
)

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

    def create(self, request, *args, **kwargs):
        try:
            print("========== SIGNUP DEBUG START ==========")
            print("SIGNUP DATA:", {
                "username": request.data.get("username"),
                "email": request.data.get("email"),
                "first_name": request.data.get("first_name"),
                "last_name": request.data.get("last_name"),
                "department": request.data.get("department"),
                "level": request.data.get("level"),
                "terms_accepted": request.data.get("terms_accepted"),
            })

            serializer = self.get_serializer(data=request.data)

            print("RUNNING SERIALIZER VALIDATION...")
            serializer.is_valid(raise_exception=True)

            print("VALIDATED DATA:", serializer.validated_data)

            print("CREATING USER...")
            self.perform_create(serializer)

            print("USER CREATED:", serializer.instance.pk)
            print("========== SIGNUP DEBUG SUCCESS ==========")

            headers = self.get_success_headers(serializer.data)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED,
                headers=headers,
            )

        except Exception as exc:
            print("========== SIGNUP CRASH ==========")
            print("EXCEPTION TYPE:", type(exc).__name__)
            print("EXCEPTION:", str(exc))
            traceback.print_exc()
            print("========== SIGNUP CRASH END ==========")

            return Response(
                {
                    "detail": f"Signup crashed: {type(exc).__name__}: {str(exc)}"
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

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

        try:
            configuration = sib_api_v3_sdk.Configuration()
            configuration.api_key['api-key'] = config('BREVO_API_KEY')
            api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=[{"email": user.email}],
                sender={"name": "CampusPulse", "email": "no-reply@campuspulse.app"},
                subject="Reset your CampusPulse password",
                text_content=f"Use this link to reset your CampusPulse password:\n\n{reset_url}\n\nThis link expires when your password is changed or the token becomes invalid.",
            )
            api_instance.send_transac_email(send_smtp_email)
        except Exception as e:
            print(f"BREVO ERROR: {e}")

        if settings.DEBUG:
            generic['reset_url'] = reset_url
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
        if not user.department or not user.level:
            return User.objects.none()
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

from urllib.parse import urlparse
from webauthn.helpers import base64url_to_bytes


def get_allowed_webauthn_origins(request=None):
    origins = set()
    configured_origin = getattr(settings, "WEBAUTHN_ORIGIN", None)
    if configured_origin:
        origins.add(configured_origin.rstrip("/"))

    for orig in getattr(settings, "CORS_ALLOWED_ORIGINS", []):
        if orig:
            origins.add(orig.rstrip("/"))

    # Common local development origins
    origins.add("http://localhost:5173")
    origins.add("http://127.0.0.1:5173")
    origins.add("http://localhost:3000")
    origins.add("http://127.0.0.1:3000")
    origins.add("http://localhost:8000")
    origins.add("http://127.0.0.1:8000")

    # If incoming request has an Origin header, allow if local or netlify
    if request:
        req_origin = request.headers.get("Origin")
        if req_origin:
            req_clean = req_origin.rstrip("/")
            parsed = urlparse(req_clean)
            if parsed.hostname and (
                parsed.hostname in ["localhost", "127.0.0.1"]
                or parsed.hostname.endswith(".netlify.app")
                or parsed.hostname.startswith("192.168.")
                or parsed.hostname.startswith("10.")
            ):
                origins.add(req_clean)

    return list(origins)


def get_webauthn_rp_id(request=None):
    configured_rp_id = getattr(settings, "WEBAUTHN_RP_ID", None)
    if configured_rp_id:
        return configured_rp_id.rstrip(".").lower()

    if request:
        req_origin = request.headers.get("Origin")
        if req_origin:
            parsed = urlparse(req_origin)
            if parsed.hostname:
                return parsed.hostname
    return getattr(settings, "WEBAUTHN_RP_ID", "localhost")


class PasskeyRegistrationOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        try:
            existing_credentials = PasskeyCredential.objects.filter(
                user=user,
                is_active=True,
            )

            rp_id = get_webauthn_rp_id(request)

            options = generate_registration_options(
                rp_id=rp_id,
                rp_name=settings.WEBAUTHN_RP_NAME,
                user_id=str(user.id).encode("utf-8"),
                user_name=user.username,
                user_display_name=(user.get_full_name() or user.username),
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

        except Exception as e:
            traceback.print_exc()
            return Response(
                {
                    "detail": "Passkey registration options failed.",
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
                status=500,
            )


class PasskeyRegistrationVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        credential = request.data.get("credential")
        challenge_id = request.data.get("challenge_id")

        if not credential:
            return Response(
                {"detail": "Passkey credential is required."},
                status=400,
            )

        if not challenge_id:
            return Response(
                {"detail": "Registration challenge is required."},
                status=400,
            )

        try:
            challenge = PasskeyChallenge.objects.get(
                id=challenge_id,
                user=user,
                challenge_type="REGISTRATION",
                used=False,
            )
        except PasskeyChallenge.DoesNotExist:
            return Response(
                {"detail": "Invalid or expired registration challenge."},
                status=400,
            )

        if challenge.expires_at < timezone.now():
            challenge.used = True
            challenge.save(update_fields=["used"])
            return Response(
                {"detail": "Registration challenge has expired."},
                status=400,
            )

        allowed_origins = get_allowed_webauthn_origins(request)
        rp_id = get_webauthn_rp_id(request)

        stored_challenge_bytes = bytes(challenge.challenge)
        try:
            verification = verify_registration_response(
                credential=credential,
                expected_challenge=stored_challenge_bytes,
                expected_origin=allowed_origins,
                expected_rp_id=rp_id,
                require_user_verification=False,
            )
        except WebAuthnException as e:
            traceback.print_exc()
            print("PASSKEY VERIFY ERROR:", repr(e), flush=True)
            return Response(
                {
                    "detail": f"Device verification failed: {str(e)}",
                },
                status=400,
            )

        challenge.used = True
        challenge.save(update_fields=["used"])

        if PasskeyCredential.objects.filter(
            credential_id=verification.credential_id
        ).exists():
            return Response(
                {"detail": "This passkey is already registered."},
                status=400,
            )

        device_type = "platform"
        if hasattr(verification, "credential_device_type") and verification.credential_device_type:
            device_type = verification.credential_device_type.value

        PasskeyCredential.objects.create(
            user=user,
            credential_id=verification.credential_id,
            public_key=verification.credential_public_key,
            sign_count=verification.sign_count,
            device_type=device_type,
            backed_up=bool(getattr(verification, "credential_backed_up", False)),
            device_name=request.data.get("device_name", "My device"),
        )

        return Response(
            {
                "detail": "Passkey registered successfully.",
            },
            status=201,
        )


class PasskeyAuthenticationOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        session_id = request.data.get("session_id")

        if not session_id:
            return Response(
                {"detail": "Lecture session is required."},
                status=400,
            )

        credentials = PasskeyCredential.objects.filter(
            user=user,
            is_active=True,
        )

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

        rp_id = get_webauthn_rp_id(request)

        options = generate_authentication_options(
            rp_id=rp_id,
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

        return Response(
            {
                "options": options_to_json(options),
                "challenge_id": challenge.id,
            }
        )


class PasskeyAuthenticationVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        credential = request.data.get("credential")
        challenge_id = request.data.get("challenge_id")

        if not credential:
            return Response(
                {"detail": "Passkey credential is required."},
                status=400,
            )

        if not challenge_id:
            return Response(
                {"detail": "Authentication challenge is required."},
                status=400,
            )

        try:
            challenge = PasskeyChallenge.objects.get(
                id=challenge_id,
                user=user,
                challenge_type="AUTHENTICATION",
                used=False,
            )
        except PasskeyChallenge.DoesNotExist:
            return Response(
                {"detail": "Invalid or expired authentication challenge."},
                status=400,
            )

        if challenge.expires_at < timezone.now():
            challenge.used = True
            challenge.save(update_fields=["used"])
            return Response(
                {"detail": "Authentication challenge has expired."},
                status=400,
            )

        credential_id_str = credential.get("id") or credential.get("rawId")
        if not credential_id_str:
            return Response(
                {"detail": "Passkey credential ID is missing."},
                status=400,
            )

        try:
            credential_id_bytes = base64url_to_bytes(credential_id_str)
        except Exception:
            return Response(
                {"detail": "Invalid passkey credential ID."},
                status=400,
            )

        try:
            passkey = PasskeyCredential.objects.get(
                user=user,
                credential_id=credential_id_bytes,
                is_active=True,
            )
        except PasskeyCredential.DoesNotExist:
            return Response(
                {"detail": "This passkey is not registered to your account."},
                status=400,
            )

        allowed_origins = get_allowed_webauthn_origins(request)
        rp_id = get_webauthn_rp_id(request)

        auth_challenge_bytes = bytes(challenge.challenge)
        try:
            verification = verify_authentication_response(
                credential=credential,
                expected_challenge=auth_challenge_bytes,
                expected_origin=allowed_origins,
                expected_rp_id=rp_id,
                credential_public_key=bytes(passkey.public_key),
                credential_current_sign_count=passkey.sign_count,
                require_user_verification=False,
            )
        except WebAuthnException as e:
            traceback.print_exc()
            print("PASSKEY AUTH VERIFY ERROR:", repr(e), flush=True)
            return Response(
                {
                    "detail": f"Device verification failed: {str(e)}",
                },
                status=400,
            )

        challenge.used = True
        challenge.save(update_fields=["used"])

        passkey.sign_count = verification.new_sign_count
        passkey.last_used_at = timezone.now()
        if hasattr(verification, "credential_device_type") and verification.credential_device_type:
            passkey.device_type = verification.credential_device_type.value
        if hasattr(verification, "credential_backed_up"):
            passkey.backed_up = verification.credential_backed_up
        passkey.save(
            update_fields=[
                "sign_count",
                "last_used_at",
                "device_type",
                "backed_up",
            ]
        )

        grant = AttendancePasskeyGrant.objects.create(
            user=user,
            session_id=challenge.session_id,
            expires_at=timezone.now() + timedelta(minutes=5),
        )

        return Response(
            {
                "detail": "Passkey verification successful.",
                "verified": True,
                "attendance_grant": str(grant.token),
            },
            status=200,
        )


class PasskeyStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        passkeys = PasskeyCredential.objects.filter(user=user, is_active=True).order_by("-created_at")
        data = [
            {
                "id": pk.id,
                "device_name": pk.device_name or "Registered passkey",
                "device_type": pk.device_type,
                "created_at": pk.created_at,
                "last_used_at": pk.last_used_at,
            }
            for pk in passkeys
        ]
        return Response({
            "has_passkey": passkeys.exists(),
            "passkeys": data,
        })

    def delete(self, request, pk=None):
        user = request.user
        if pk:
            count, _ = PasskeyCredential.objects.filter(user=user, id=pk).delete()
        else:
            count, _ = PasskeyCredential.objects.filter(user=user).delete()
        return Response({
            "detail": "Passkey removed successfully.",
            "deleted_count": count,
        })