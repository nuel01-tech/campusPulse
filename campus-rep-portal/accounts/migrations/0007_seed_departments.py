from django.db import migrations

INITIAL_DEPARTMENTS = [
    {"name": "Computer Science", "faculty": "Faculty of Science"},
    {"name": "Mathematics", "faculty": "Faculty of Science"},
    {"name": "Physics", "faculty": "Faculty of Science"},
    {"name": "Chemistry", "faculty": "Faculty of Science"},
    {"name": "Microbiology", "faculty": "Faculty of Science"},
    {"name": "Biochemistry", "faculty": "Faculty of Science"},
    {"name": "Plant Science", "faculty": "Faculty of Science"},
    {"name": "Zoology", "faculty": "Faculty of Science"},
    {"name": "Accounting", "faculty": "Faculty of Administration & Management Sciences"},
    {"name": "Banking & Finance", "faculty": "Faculty of Administration & Management Sciences"},
    {"name": "Business Administration", "faculty": "Faculty of Administration & Management Sciences"},
    {"name": "Public Administration", "faculty": "Faculty of Administration & Management Sciences"},
    {"name": "Economics", "faculty": "Faculty of Social Sciences"},
    {"name": "Mass Communication", "faculty": "Faculty of Social Sciences"},
    {"name": "Political Science", "faculty": "Faculty of Social Sciences"},
    {"name": "Sociology", "faculty": "Faculty of Social Sciences"},
    {"name": "Computer Engineering", "faculty": "Faculty of Engineering & Technology"},
    {"name": "Electrical & Electronics Engineering", "faculty": "Faculty of Engineering & Technology"},
    {"name": "Mechanical Engineering", "faculty": "Faculty of Engineering & Technology"},
    {"name": "Civil Engineering", "faculty": "Faculty of Engineering & Technology"},
    {"name": "English & Literary Studies", "faculty": "Faculty of Arts"},
    {"name": "History & Diplomatic Studies", "faculty": "Faculty of Arts"},
    {"name": "Law", "faculty": "Faculty of Law"},
    {"name": "Nursing Science", "faculty": "Faculty of Basic Medical Sciences"},
    {"name": "Medicine & Surgery", "faculty": "Faculty of Clinical Sciences"},
    {"name": "Pharmacy", "faculty": "Faculty of Pharmacy"},
]

def seed_departments(apps, schema_editor):
    Department = apps.get_model('accounts', 'Department')
    for item in INITIAL_DEPARTMENTS:
        if not Department.objects.filter(name__iexact=item['name']).exists():
            Department.objects.create(
                name=item['name'],
                faculty=item['faculty']
            )

def unseed_departments(apps, schema_editor):
    Department = apps.get_model('accounts', 'Department')
    for item in INITIAL_DEPARTMENTS:
        Department.objects.filter(name=item['name']).delete()

class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0006_profile_picture'),
    ]

    operations = [
        migrations.RunPython(seed_departments, unseed_departments),
    ]
