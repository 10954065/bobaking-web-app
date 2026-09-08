export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  /** [longitude, latitude] pairs in path order — GeoJSON/MapLibre convention. */
  geometry: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

export class RoutingError extends Error {
  constructor(message = "Could not calculate a route.") {
    super(message);
    this.name = "RoutingError";
  }
}

/**
 * Swappable routing backend — RoutingService depends on this interface, not
 * on any specific provider, so a self-hosted OSRM instance, a different
 * open-source router (Valhalla, GraphHopper), or a commercial provider can
 * replace OsrmRoutingProvider later without touching application code.
 */
export interface RoutingProvider {
  name: string;
  getRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult>;
}
