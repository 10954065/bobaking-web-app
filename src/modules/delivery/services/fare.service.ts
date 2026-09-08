const EARTH_RADIUS_KM = 6371;

/**
 * Assumed average urban delivery speed used to turn distance into an ETA when
 * no live routing/maps API is configured — same documented-approximation
 * posture as the other dev-stub integrations in this codebase (payments,
 * notifications): honest about what it is, not pretending to be a real
 * routing engine.
 */
const AVERAGE_SPEED_KMH = 22;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface FareConfig {
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  /** Floor the computed fare never drops below (e.g. Branch.defaultDeliveryFee). */
  minimumFare: number;
}

export interface FareEstimate {
  distanceKm: number;
  etaMinutes: number;
  fare: number;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Great-circle distance between two points, in kilometers. */
export function haversineDistanceKm(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * The same linear fare model ride-hailing/delivery platforms (Bolt, Yango,
 * Uber) use: fare = base + perKm * distance + perMinute * duration, floored
 * at a minimum fare so a very short hop never undercuts the cost of
 * dispatching a rider. Distance is straight-line (Haversine), not routed —
 * there's no maps/routing provider wired up, so this is a documented
 * approximation rather than turn-by-turn distance.
 */
export function estimateDeliveryFare(origin: Coordinates, destination: Coordinates, config: FareConfig): FareEstimate {
  const distanceKm = haversineDistanceKm(origin, destination);
  const etaMinutes = (distanceKm / AVERAGE_SPEED_KMH) * 60;
  const rawFare = config.baseFare + config.perKmRate * distanceKm + config.perMinuteRate * etaMinutes;

  return {
    distanceKm: round2(distanceKm),
    etaMinutes: Math.round(etaMinutes),
    fare: Math.max(round2(rawFare), config.minimumFare),
  };
}
