from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0007_seed_departments'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='registration_completed',
            field=models.BooleanField(default=False),
        ),
    ]