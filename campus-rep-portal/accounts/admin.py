from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.core.exceptions import PermissionDenied
from .models import AdminAuditEvent, User, Department, PushSubscription


class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('CampusPulse Info', {
            'fields': ('role', 'department', 'level', 'matric_number', 'phone_number', 'enable_wakeup_calls')
        }),
    )
    list_display = ('username', 'email', 'role', 'department', 'level', 'is_staff')

    def has_delete_permission(self, request, obj=None):
        return False

    def delete_model(self, request, obj):
        raise PermissionDenied("User accounts must be deactivated, not deleted.")

    def delete_queryset(self, request, queryset):
        raise PermissionDenied("User accounts must be deactivated, not deleted.")


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "faculty")
    search_fields = ("name", "faculty")

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.register(User, CustomUserAdmin)
admin.site.register(PushSubscription)


@admin.register(AdminAuditEvent)
class AdminAuditEventAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor", "action", "target_type", "target_id", "summary")
    list_filter = ("action", "target_type")
    search_fields = ("actor__username", "summary", "target_id")
    readonly_fields = (
        "actor",
        "action",
        "target_type",
        "target_id",
        "summary",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False