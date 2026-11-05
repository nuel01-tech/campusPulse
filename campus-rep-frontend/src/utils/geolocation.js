/**
 * Resilient browser geolocation helper.
 * Attempts a high-accuracy GPS fix first with a short timeout; if the device
 * is indoors or on a desktop/laptop where GPS satellite lock times out or is
 * unavailable, automatically falls back to network/Wi-Fi positioning.
 */
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      const err = new Error("Geolocation is not supported by your browser.");
      err.code = 0;
      reject(err);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (highAccuracyError) => {
        // Permission denied (code 1) should not be retried.
        if (highAccuracyError && highAccuracyError.code === 1) {
          reject(highAccuracyError);
          return;
        }
        // Fallback to network/Wi-Fi location for indoor phones & laptops.
        navigator.geolocation.getCurrentPosition(
          (fallbackPosition) => resolve(fallbackPosition),
          (fallbackError) => reject(fallbackError),
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000,
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 30000,
      }
    );
  });
}

/**
 * Returns a numeric accuracy in meters only when the browser reported a tight
 * GPS satellite fix. Coarse Wi-Fi / cell-tower uncertainty values (common
 * indoors) are omitted so the server validates actual Haversine distance
 * against the venue radius rather than rejecting indoor students.
 */
export function getHighPrecisionAccuracy(position, radiusMeters = 50) {
  const raw = position?.coords?.accuracy;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
    return undefined;
  }
  const safeThreshold = Math.min(25, Math.max(10, (Number(radiusMeters) || 50) * 0.4));
  return raw <= safeThreshold ? raw : undefined;
}
