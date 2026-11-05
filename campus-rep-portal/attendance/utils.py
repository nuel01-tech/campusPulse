from math import atan2, cos, isfinite, radians, sin, sqrt


EARTH_RADIUS_METERS = 6_371_000


def _coordinate(value, name, minimum, maximum):
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{name} must be a valid number.")
    if not isfinite(number) or not minimum <= number <= maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}.")
    return number


def haversine_distance(lat1, lon1, lat2, lon2):
    """Return the great-circle distance between two GPS points, in metres."""
    lat1 = _coordinate(lat1, "Latitude 1", -90, 90)
    lon1 = _coordinate(lon1, "Longitude 1", -180, 180)
    lat2 = _coordinate(lat2, "Latitude 2", -90, 90)
    lon2 = _coordinate(lon2, "Longitude 2", -180, 180)

    lat1, lon1, lat2, lon2 = map(radians, (lat1, lon1, lat2, lon2))
    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    # Floating-point rounding can put a just outside [0, 1].
    a = min(1.0, max(0.0, a))
    return EARTH_RADIUS_METERS * 2 * atan2(sqrt(a), sqrt(1 - a))


def is_location_confidently_within_radius(distance_meters, accuracy_meters, radius_meters):
    """Only accept a fix when its reported uncertainty fits inside the radius."""
    distance = float(distance_meters)
    accuracy = float(accuracy_meters)
    radius = float(radius_meters)
    if not all(isfinite(value) for value in (distance, accuracy, radius)):
        return False
    if distance < 0 or accuracy < 0 or radius <= 0:
        return False
    return distance + accuracy <= radius
