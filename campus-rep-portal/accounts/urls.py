from django.urls import path
from .views import (
    ChangePasswordView, DepartmentListView, ForgotPasswordView, MyProfileView,
    PreferencesView, ResetPasswordView, SaveSubscriptionView, SignupView, UpdateMatricView,
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
]
