import { appError } from './errors';
import type { GeoFix } from '@/types';

const EARTH_RADIUS_M = 6_371_000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. Matches public.distance_m in SQL. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

interface LocateOptions {
  /** Keep watching until accuracy is at or below this many metres. */
  targetAccuracy?: number;
  /** Give up and return the best fix seen after this many ms. */
  timeoutMs?: number;
}

/**
 * Gets the current position. Phones often return a coarse fix first and then
 * refine it, so we watch briefly and return the most accurate reading.
 */
export function locate({ targetAccuracy = 30, timeoutMs = 12_000 }: LocateOptions = {}): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext) return reject(appError('GEO_INSECURE'));
    if (!('geolocation' in navigator)) return reject(appError('GEO_UNSUPPORTED'));

    let best: GeoFix | null = null;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      fn();
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        if (!best || fix.accuracy < best.accuracy) best = fix;
        if (fix.accuracy <= targetAccuracy) finish(() => resolve(fix));
      },
      (err) => {
        // If we already have something usable, prefer it over an error.
        if (best) return finish(() => resolve(best!));
        const code =
          err.code === err.PERMISSION_DENIED
            ? 'GEO_DENIED'
            : err.code === err.TIMEOUT
              ? 'GEO_TIMEOUT'
              : 'GEO_UNAVAILABLE';
        finish(() => reject(appError(code)));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs },
    );

    const timer = setTimeout(() => {
      finish(() => (best ? resolve(best) : reject(appError('GEO_TIMEOUT'))));
    }, timeoutMs);
  });
}
