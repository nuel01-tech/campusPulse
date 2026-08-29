from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0004_pushsubscription'),
    ]

    operations = [
        migrations.AddField(
            model_name='user', name='push_notifications',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user', name='email_notifications',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user', name='session_notifications',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user', name='announcement_notifications',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user', name='terms_accepted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
