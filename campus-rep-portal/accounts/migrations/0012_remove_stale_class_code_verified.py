from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_user_registration_completed'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE accounts_user
                DROP COLUMN IF EXISTS class_code_verified;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]