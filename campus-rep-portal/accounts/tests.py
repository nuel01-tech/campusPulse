from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from accounts.models import Department
from accounts.serializers import SignupSerializer
from attendance.models import ClassCode

User = get_user_model()


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
            'terms_accepted': True,
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
            'terms_accepted': True,
        }

        serializer = SignupSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('class_code', serializer.errors)


class ClassmatesAndManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.department = Department.objects.create(name='Computer Science', faculty='Science')
        
        # Create a Course Rep
        self.rep = User.objects.create_user(
            username='rep_user',
            first_name='Rep',
            last_name='Leader',
            email='rep@example.com',
            role='CLASS_REP',
            department=self.department,
            level='200',
            phone_number='08011112222',
            matric_number='CMP/2022/001'
        )

        # Create Student 1
        self.student1 = User.objects.create_user(
            username='student_one',
            first_name='Alice',
            last_name='Johnson',
            email='alice@example.com',
            role='STUDENT',
            department=self.department,
            level='200',
            phone_number='08033334444',
            matric_number='CMP/2022/010'
        )

        # Create Student 2 (mistaken account)
        self.student2 = User.objects.create_user(
            username='student_two_dup',
            first_name='Alice',
            last_name='Johnson',
            email='alice_dup@example.com',
            role='STUDENT',
            department=self.department,
            level='200',
            phone_number='08055556666',
            matric_number='CMP/2022/099'
        )

    def test_student_view_returns_minimal_safe_profile(self):
        self.client.force_authenticate(user=self.student1)
        response = self.client.get('/api/accounts/classmates/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(len(data) >= 1)
        first = data[0]
        # Verify allowed public fields exist
        self.assertIn('username', first)
        self.assertIn('first_name', first)
        self.assertIn('last_name', first)
        self.assertIn('level', first)
        # Verify private/administrative fields are NOT exposed to students
        self.assertNotIn('email', first)
        self.assertNotIn('phone_number', first)
        self.assertNotIn('matric_number', first)
        self.assertNotIn('is_active', first)

    def test_rep_view_returns_full_details(self):
        self.client.force_authenticate(user=self.rep)
        response = self.client.get('/api/accounts/classmates/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(len(data) >= 2)
        # Find student1
        student_data = next((s for s in data if s['username'] == 'student_one'), None)
        self.assertIsNotNone(student_data)
        # Verify full details are available for Course Rep
        self.assertEqual(student_data['matric_number'], 'CMP/2022/010')
        self.assertEqual(student_data['email'], 'alice@example.com')
        self.assertEqual(student_data['phone_number'], '08033334444')
        self.assertIn('is_active', student_data)

    def test_rep_can_toggle_suspend_student(self):
        self.client.force_authenticate(user=self.rep)
        self.assertTrue(self.student1.is_active)

        # Suspend student
        response = self.client.patch(f'/api/accounts/classmates/{self.student1.id}/toggle-suspend/')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()['is_active'])

        self.student1.refresh_from_db()
        self.assertFalse(self.student1.is_active)

        # Reactivate student
        response = self.client.patch(f'/api/accounts/classmates/{self.student1.id}/toggle-suspend/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['is_active'])

        self.student1.refresh_from_db()
        self.assertTrue(self.student1.is_active)

    def test_rep_can_delete_mistaken_student_account(self):
        self.client.force_authenticate(user=self.rep)
        target_id = self.student2.id
        self.assertTrue(User.objects.filter(pk=target_id).exists())

        response = self.client.delete(f'/api/accounts/classmates/{target_id}/delete-account/')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(pk=target_id).exists())

    def test_student_cannot_suspend_or_delete_classmates(self):
        self.client.force_authenticate(user=self.student1)
        
        # Student attempting suspend
        response = self.client.patch(f'/api/accounts/classmates/{self.student2.id}/toggle-suspend/')
        self.assertEqual(response.status_code, 403)

        # Student attempting delete
        response = self.client.delete(f'/api/accounts/classmates/{self.student2.id}/delete-account/')
        self.assertEqual(response.status_code, 403)
