import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// env.ts validates real secrets (DATABASE_URL, AUTH_SECRET, ...) that aren't
// set in the test process — mock it the same way rate-limit.test.ts mocks
// @/lib/redis, so OsrmRoutingProvider can read ROUTING_API_URL without
// tripping that validation.
vi.mock("@/lib/env", () => ({ env: { ROUTING_API_URL: "https://router.example.test" } }));

const { getDeliveryRoute, shouldRecalculateRoute } = await import("./routing.service");

const EAST_LEGON = { latitude: 5.6494, longitude: -0.1531 };
const OSU = { latitude: 5.5558, longitude: -0.1826 };

describe("shouldRecalculateRoute", () => {
  it("is false for a tiny movement below the threshold", () => {
    expect(shouldRecalculateRoute(EAST_LEGON, { latitude: 5.6495, longitude: -0.1531 }, 120)).toBe(false);
  });

  it("is true once the rider has moved past the threshold", () => {
    expect(shouldRecalculateRoute(EAST_LEGON, OSU, 120)).toBe(true);
  });
});

describe("getDeliveryRoute", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns the provider's road route and distance/ETA when the routing provider succeeds", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: "Ok",
        routes: [
          {
            geometry: { type: "LineString", coordinates: [[EAST_LEGON.longitude, EAST_LEGON.latitude], [OSU.longitude, OSU.latitude]] },
            distance: 8000,
            duration: 900,
          },
        ],
      }),
    }) as unknown as typeof fetch;

    // A distinct origin (not just a sub-cache-precision nudge) avoids hitting
    // routing.service.ts's own cache from the other test in this file.
    const origin = { latitude: 5.601, longitude: -0.161 };
    const route = await getDeliveryRoute(origin, OSU);

    expect(route.isEstimate).toBe(false);
    expect(route.distanceKm).toBeCloseTo(8, 1);
    expect(route.etaMinutesLow).toBeGreaterThan(0);
    expect(route.etaMinutesHigh).toBeGreaterThanOrEqual(route.etaMinutesLow);
  });

  it("falls back to a straight-line estimate (clearly flagged) when the routing provider is unreachable", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const origin = { latitude: 5.602, longitude: -0.162 };
    const route = await getDeliveryRoute(origin, OSU);

    expect(route.isEstimate).toBe(true);
    expect(route.distanceKm).toBeGreaterThan(0);
    expect(route.geometry).toHaveLength(2);
  });
});
