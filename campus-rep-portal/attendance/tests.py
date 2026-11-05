from django.test import SimpleTestCase

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
