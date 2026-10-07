from django.urls import path
from .views import (
    ChangePasswordView, ClassmatesView, DeleteStudentAccountView, DepartmentListView,
    ForgotPasswordView, MyProfileView, PreferencesView, ResetPasswordView,
    SaveSubscriptionView, SignupView, ToggleSuspendStudentView, UpdateMatricView,PasskeyRegistrationOptionsView,
    PasskeyRegistrationVerifyView, PasskeyAuthenticationOptionsView,
    PasskeyAuthenticationVerifyView, PasskeyStatusView,
)

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('profile/', MyProfileView.as_view(), name='profile'),
    path('preferences/', PreferencesView.as_view(), name='preferences'),
    path('update-matric/', UpdateMatricView.as_view(), name='update-matric'),
    path('departments/', DepartmentListView.as_view(), name='departments'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('save-subscription/', SaveSubscriptionView.as_view(), name='save-subscription'),
    path('classmates/', ClassmatesView.as_view(), name='classmates'),
    path('classmates/<int:pk>/toggle-suspend/', ToggleSuspendStudentView.as_view(), name='toggle-suspend-student'),
    path('classmates/<int:pk>/delete-account/', DeleteStudentAccountView.as_view(), name='delete-student-account'),
    path('passkeys/status/', PasskeyStatusView.as_view(), name='passkey-status'),
    path('passkeys/delete-all/', PasskeyStatusView.as_view(), name='passkey-delete-all'),
    path('passkeys/<int:pk>/delete/', PasskeyStatusView.as_view(), name='passkey-delete'),
    path('passkeys/register/options/', PasskeyRegistrationOptionsView.as_view(), name='passkey-register-options'),
    path('passkeys/register/verify/', PasskeyRegistrationVerifyView.as_view(), name='passkey-register-verify'),
    path('passkeys/auth/options/', PasskeyAuthenticationOptionsView.as_view(), name='passkey-auth-options'),
    path('passkeys/auth/verify/', PasskeyAuthenticationVerifyView.as_view(), name='passkey-auth-verify'),
]
