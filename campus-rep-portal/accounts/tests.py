from django.test import TestCase

from accounts.models import Department
from accounts.serializers import SignupSerializer
from attendance.models import ClassCode


class SignupClassCodeValidationTests(TestCase):
    def setUp(self):
        self.department = Department.objects.create(name='Computer Science', faculty='Science')
        ClassCode.objects.create(department=self.department, level='200', code='AB12CD')

    def test_signup_accepts_matching_department_level_code(self):
        data = {
            'username': 'student1',
            'first_name': 'Jane',
            'last_name': 'Doe',
            'email': 'student1@example.com',
            'password': 'StrongPass123',
            'department': self.department.id,
            'level': '200',
            'phone_number': '08012345678',
            'class_code': 'AB12CD',
        }

        serializer = SignupSerializer(data=data)

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_signup_rejects_wrong_code_for_department_level(self):
        data = {
            'username': 'student2',
            'first_name': 'John',
            'last_name': 'Smith',
            'email': 'student2@example.com',
            'password': 'StrongPass123',
            'department': self.department.id,
            'level': '200',
            'phone_number': '08012345679',
            'class_code': 'ZZ99XX',
        }

        serializer = SignupSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn('class_code', serializer.errors)
