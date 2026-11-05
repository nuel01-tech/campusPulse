from django.test import SimpleTestCase, TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from accounts.models import Department
from .models import AttendanceRecord, LectureSession
from .serializers import LectureSessionSerializer

from .utils import haversine_distance, is_location_confidently_within_radius


class HaversineDistanceTests(SimpleTestCase):
    def test_same_point_is_zero_distance(self):
        self.assertAlmostEqual(haversine_distance(6.830, 3.500, 6.830, 3.500), 0, places=6)

    def test_one_degree_longitude_at_equator_is_about_111_2_km(self):
        self.assertAlmostEqual(haversine_distance(0, 0, 0, 1), 111_194.9, delta=100)

    def test_antimeridian_uses_short_route(self):
        self.assertLess(haversine_distance(0, 179.9, 0, -179.9), 23_000)

    def test_rejects_out_of_range_coordinates(self):
        with self.assertRaises(ValueError):
            haversine_distance(91, 0, 0, 0)
        with self.assertRaises(ValueError):
            haversine_distance(0, 181, 0, 0)

    def test_rejects_non_finite_coordinates(self):
        with self.assertRaises(ValueError):
            haversine_distance(float("nan"), 0, 0, 0)


class GPSAccuracyTests(SimpleTestCase):
    def test_accepts_fix_when_distance_plus_uncertainty_is_inside_radius(self):
        self.assertTrue(is_location_confidently_within_radius(20, 10, 50))

    def test_rejects_fix_when_uncertainty_crosses_radius(self):
        self.assertFalse(is_location_confidently_within_radius(45, 10, 50))

    def test_rejects_invalid_accuracy(self):
        self.assertFalse(is_location_confidently_within_radius(20, float("nan"), 50))


class StudentAttendanceStatsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.department = Department.objects.create(name="Computer Science", faculty="Science")
        self.student = get_user_model().objects.create_user(
            username="stats_student",
            password="StrongPass123",
            department=self.department,
            level="200",
            role="STUDENT",
        )
        self.client.force_authenticate(user=self.student)

    def create_session(self, *, is_active, has_ended):
        return LectureSession.objects.create(
            department=self.department,
            level="200",
            course_code="CSC201",
            venue_name="LT1",
            latitude=6.8,
            longitude=3.5,
            is_active=is_active,
            has_ended=has_ended,
        )

    def test_never_started_sessions_do_not_reduce_attendance_rate(self):
        completed = self.create_session(is_active=False, has_ended=True)
        self.create_session(is_active=True, has_ended=False)
        self.create_session(is_active=False, has_ended=False)
        AttendanceRecord.objects.create(student=self.student, session=completed)

        response = self.client.get("/api/attendance/my-stats/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_sessions"], 2)
        self.assertEqual(response.data["attended"], 1)
        self.assertEqual(response.data["rate"], 50)


class LectureSessionInputValidationTests(TestCase):
    def setUp(self):
        self.department = Department.objects.create(name="Physics", faculty="Science")

    def payload(self):
        return {
            "department": self.department.pk,
            "level": "200",
            "course_code": "PHY201",
            "venue_name": "Science Theatre",
            "latitude": 6.8,
            "longitude": 3.5,
            "radius_meters": 50,
        }

    def test_rejects_latitude_outside_valid_range(self):
        serializer = LectureSessionSerializer(data={**self.payload(), "latitude": 91})
        self.assertFalse(serializer.is_valid())
        self.assertIn("latitude", serializer.errors)

    def test_rejects_longitude_outside_valid_range(self):
        serializer = LectureSessionSerializer(data={**self.payload(), "longitude": 181})
        self.assertFalse(serializer.is_valid())
        self.assertIn("longitude", serializer.errors)

    def test_rejects_zero_or_negative_attendance_radius(self):
        for radius in (0, -10):
            with self.subTest(radius=radius):
                serializer = LectureSessionSerializer(data={**self.payload(), "radius_meters": radius})
                self.assertFalse(serializer.is_valid())
                self.assertIn("radius_meters", serializer.errors)
