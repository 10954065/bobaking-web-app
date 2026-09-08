import { haversineDistanceKm, type Coordinates } from "@/modules/delivery/services/fare.service";

/** GPS fixes worse than this are too noisy to trust for a delivery map (a rough cell-tower fix, not real GPS). */
const MAX_ACCEPTABLE_ACCURACY_METERS = 500;

/** Above this, two fixes this far apart in this little time aren't a real rider moving — treat as a bad fix rather than teleport the marker. */
const MAX_PLAUSIBLE_SPEED_KMH = 180;

export function isValidLatitude(latitude: number): boolean {
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90;
}

export function isValidLongitude(longitude: number): boolean {
  return Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

export function isValidCoordinates(latitude: number, longitude: number): boolean {
  return isValidLatitude(latitude) && isValidLongitude(longitude);
}

/** Rejects a fix so poor it isn't worth showing — the caller should keep the last good position rather than jump the marker to a low-confidence one. */
export function isAcceptableAccuracy(accuracyMeters: number): boolean {
  return Number.isFinite(accuracyMeters) && accuracyMeters > 0 && accuracyMeters <= MAX_ACCEPTABLE_ACCURACY_METERS;
}

export interface LocationSample {
  latitude: number;
  longitude: number;
  recordedAt: Date;
}

/**
 * True when the implied speed between two fixes is physically implausible
 * for a delivery rider — the "Accra to another country in 2 seconds"
 * scenario. A non-positive time delta (out-of-order/duplicate/clock-skew
 * update) is also flagged, since implied speed is undefined/infinite there.
 */
export function isImplausibleJump(previous: LocationSample, next: LocationSample, maxSpeedKmh = MAX_PLAUSIBLE_SPEED_KMH): boolean {
  const deltaSeconds = (next.recordedAt.getTime() - previous.recordedAt.getTime()) / 1000;
  if (deltaSeconds <= 0) return true;

  const distanceKm = haversineDistanceKm(
    { latitude: previous.latitude, longitude: previous.longitude },
    { latitude: next.latitude, longitude: next.longitude }
  );
  const impliedSpeedKmh = distanceKm / (deltaSeconds / 3600);
  return impliedSpeedKmh > maxSpeedKmh;
}

/** Great-circle distance between two points, in meters — thin wrapper so callers working in meters (thresholds, "how close is the rider") don't have to remember fare.service.ts's km convention. */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  return haversineDistanceKm(a, b) * 1000;
}
