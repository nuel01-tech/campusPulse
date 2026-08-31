from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Department, PushSubscription


class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('CampusPulse Info', {
            'fields': ('role', 'department', 'level', 'matric_number', 'phone_number', 'enable_wakeup_calls')
        }),
    )
    list_display = ('username', 'email', 'role', 'department', 'level', 'is_staff')


admin.site.register(User, CustomUserAdmin)
admin.site.register(Department)
admin.site.register(PushSubscription)