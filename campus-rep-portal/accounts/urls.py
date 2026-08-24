from django.urls import path
from .views import SignupView, UpdateMatricView, DepartmentListView, ChangePasswordView

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('update-matric/', UpdateMatricView.as_view(), name='update-matric'),
    path('departments/', DepartmentListView.as_view(), name='departments'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
]

from .views import SignupView, UpdateMatricView, DepartmentListView, ChangePasswordView, SaveSubscriptionView

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('update-matric/', UpdateMatricView.as_view(), name='update-matric'),
    path('departments/', DepartmentListView.as_view(), name='departments'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('save-subscription/', SaveSubscriptionView.as_view(), name='save-subscription'),
]