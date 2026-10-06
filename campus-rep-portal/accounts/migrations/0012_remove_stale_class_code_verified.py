from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0011_user_registration_completed"),
    ]

    operations = [
        migrations.RunSQL(
            sql="",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]