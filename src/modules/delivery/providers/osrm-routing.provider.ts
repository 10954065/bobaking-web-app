import { env } from "@/lib/env";
import { RoutingError, type Coordinates, type RoutingProvider, type RouteResult } from "./routing-provider.interface";

const REQUEST_TIMEOUT_MS = 8000;

interface OsrmRouteResponse {
  code: string;
  message?: string;
  routes?: {
    geometry: { coordinates: [number, number][]; type: string };
    distance: number;
    duration: number;
  }[];
}

/**
 * Talks to any OSRM-compatible HTTP API (the public demo server by default —
 * see env.ts's ROUTING_API_URL doc comment — or a self-hosted instance in
 * production). Requests GeoJSON geometry directly (geometries=geojson)
 * rather than OSRM's default encoded polyline, so no separate
 * polyline-decoding dependency is needed.
 */
export class OsrmRoutingProvider implements RoutingProvider {
  readonly name = "osrm";

  async getRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
    const url =
      `${env.ROUTING_API_URL}/route/v1/driving/` +
      `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
      `?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new RoutingError("Routing request timed out.");
      }
      throw new RoutingError("Could not reach the routing provider.");
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new RoutingError(`Routing provider responded with ${response.status}.`);
    }

    const data = (await response.json()) as OsrmRouteResponse;
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route) {
      throw new RoutingError(data.message ?? "No route found between these points.");
    }

    return {
      geometry: route.geometry.coordinates,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  }
}
