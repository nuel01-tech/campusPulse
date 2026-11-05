# Generated for weekly class attendance registers.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('attendance', '0013_attendancerecord_check_in_method_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.CreateModel(
            name='WeeklyAttendanceRegister',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('level', models.CharField(choices=[('100', '100 Level'), ('200', '200 Level'), ('300', '300 Level'), ('400', '400 Level'), ('500', '500 Level')], max_length=3)),
                ('academic_year', models.CharField(max_length=9)),
                ('week_number', models.PositiveSmallIntegerField()),
                ('week_start_date', models.DateField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='weekly_attendance_registers', to=settings.AUTH_USER_MODEL)),
                ('department', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='accounts.department')),
            ],
            options={'ordering': ['academic_year', 'week_number']},
        ),
        migrations.CreateModel(
            name='WeeklyAttendanceEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('UNMARKED', 'Not marked'), ('PRESENT', 'Present'), ('ABSENT', 'Absent'), ('EXCUSED', 'Excused')], default='UNMARKED', max_length=10)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('marked_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='weekly_attendance_marks', to=settings.AUTH_USER_MODEL)),
                ('register', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='entries', to='attendance.weeklyattendanceregister')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['student__last_name', 'student__first_name', 'student__username']},
        ),
        migrations.AddConstraint(model_name='weeklyattendanceregister', constraint=models.UniqueConstraint(fields=('department', 'level', 'academic_year', 'week_number'), name='unique_weekly_class_register')),
        migrations.AddConstraint(model_name='weeklyattendanceregister', constraint=models.CheckConstraint(condition=models.Q(('week_number__gte', 1), ('week_number__lte', 52)), name='weekly_register_week_1_52')),
        migrations.AddConstraint(model_name='weeklyattendanceentry', constraint=models.UniqueConstraint(fields=('register', 'student'), name='unique_student_weekly_attendance')),
    ]
