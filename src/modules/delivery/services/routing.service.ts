import { OsrmRoutingProvider } from "@/modules/delivery/providers/osrm-routing.provider";
import { haversineDistanceKm } from "@/modules/delivery/services/fare.service";
import type { Coordinates, RoutingProvider, RouteResult } from "@/modules/delivery/providers/routing-provider.interface";

// Swap the concrete provider here (or make it env-driven) to change routing
// backends without touching any caller — every caller depends only on
// RoutingProvider (see providers/routing-provider.interface.ts).
const provider: RoutingProvider = new OsrmRoutingProvider();

const AVERAGE_FALLBACK_SPEED_KMH = 22;
const CACHE_TTL_MS = 60_000;
// ~11m precision — enough to dedupe "the rider pinged twice in the same
// spot" without serving a route calculated for a meaningfully different point.
const CACHE_COORD_PRECISION = 4;

interface CacheEntry {
  result: RouteResult;
  expiresAt: number;
}

const routeCache = new Map<string, CacheEntry>();

function roundCoord(value: number): number {
  return Number(value.toFixed(CACHE_COORD_PRECISION));
}

function cacheKey(origin: Coordinates, destination: Coordinates): string {
  return [roundCoord(origin.latitude), roundCoord(origin.longitude), roundCoord(destination.latitude), roundCoord(destination.longitude)].join(
    ","
  );
}

export interface DeliveryRoute {
  /** [longitude, latitude] pairs, ready for a MapLibre GeoJSON LineString source. */
  geometry: [number, number][];
  distanceKm: number;
  /** Whether this came from the real routing provider or the straight-line fallback — surfaced so the UI can be honest about precision. */
  isEstimate: boolean;
  etaMinutesLow: number;
  etaMinutesHigh: number;
}

function toEtaRange(durationSeconds: number): { low: number; high: number } {
  const minutes = durationSeconds / 60;
  // Deliberately a range, not a single "arrival in exactly N minutes" figure
  // — traffic/prep/parking variance makes false precision misleading.
  const low = Math.max(1, Math.round(minutes * 0.85));
  const high = Math.max(low + 1, Math.round(minutes * 1.2));
  return { low, high };
}

/** Straight-line distance at an assumed average speed — used only when the real routing provider is unreachable, so the UI still has *something* rather than a blank map. */
function fallbackRoute(origin: Coordinates, destination: Coordinates): DeliveryRoute {
  const distanceKm = haversineDistanceKm(origin, destination);
  const durationSeconds = (distanceKm / AVERAGE_FALLBACK_SPEED_KMH) * 3600;
  const { low, high } = toEtaRange(durationSeconds);
  return {
    geometry: [
      [origin.longitude, origin.latitude],
      [destination.longitude, destination.latitude],
    ],
    distanceKm: Math.round(distanceKm * 10) / 10,
    isEstimate: true,
    etaMinutesLow: low,
    etaMinutesHigh: high,
  };
}

/**
 * The single entry point every caller (rider nav, customer tracking, admin
 * board) should use to get a road route — never call OsrmRoutingProvider
 * directly. Caches identical requests briefly (see CACHE_TTL_MS) so a
 * GPS-ping-driven UI doesn't hammer the routing provider, and falls back to
 * a straight-line estimate (clearly flagged via isEstimate) rather than
 * throwing, so a routing-provider outage degrades the map instead of
 * breaking it.
 */
export async function getDeliveryRoute(origin: Coordinates, destination: Coordinates): Promise<DeliveryRoute> {
  const key = cacheKey(origin, destination);
  const cached = routeCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    const { low, high } = toEtaRange(cached.result.durationSeconds);
    return {
      geometry: cached.result.geometry,
      distanceKm: Math.round((cached.result.distanceMeters / 1000) * 10) / 10,
      isEstimate: false,
      etaMinutesLow: low,
      etaMinutesHigh: high,
    };
  }

  try {
    const result = await provider.getRoute(origin, destination);
    routeCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    const { low, high } = toEtaRange(result.durationSeconds);
    return {
      geometry: result.geometry,
      distanceKm: Math.round((result.distanceMeters / 1000) * 10) / 10,
      isEstimate: false,
      etaMinutesLow: low,
      etaMinutesHigh: high,
    };
  } catch {
    return fallbackRoute(origin, destination);
  }
}

/**
 * Whether it's worth asking the routing provider for a new route, given how
 * far the rider has moved since the route currently on screen was
 * calculated — avoids recalculating on every single GPS ping (Phase 9's
 * "do not recalculate the route on every GPS update").
 */
export function shouldRecalculateRoute(lastRouteOrigin: Coordinates, currentPosition: Coordinates, thresholdMeters = 120): boolean {
  const movedKm = haversineDistanceKm(lastRouteOrigin, currentPosition);
  return movedKm * 1000 >= thresholdMeters;
}
