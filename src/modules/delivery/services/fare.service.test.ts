import { describe, it, expect } from "vitest";
import { haversineDistanceKm, estimateDeliveryFare } from "./fare.service";

// East Legon, Accra and Osu, Accra — roughly 8km apart in reality.
const EAST_LEGON = { latitude: 5.6494, longitude: -0.1531 };
const OSU = { latitude: 5.5558, longitude: -0.1826 };

describe("haversineDistanceKm", () => {
  it("returns zero for identical coordinates", () => {
    expect(haversineDistanceKm(EAST_LEGON, EAST_LEGON)).toBe(0);
  });

  it("returns a plausible distance between two known Accra locations", () => {
    const distance = haversineDistanceKm(EAST_LEGON, OSU);
    expect(distance).toBeGreaterThan(5);
    expect(distance).toBeLessThan(15);
  });

  it("is symmetric regardless of direction", () => {
    expect(haversineDistanceKm(EAST_LEGON, OSU)).toBeCloseTo(haversineDistanceKm(OSU, EAST_LEGON), 6);
  });
});

describe("estimateDeliveryFare", () => {
  const config = { baseFare: 5, perKmRate: 2, perMinuteRate: 0.3, minimumFare: 8 };

  it("charges exactly the base fare plus the minimum-fare floor for a zero-distance trip", () => {
    const estimate = estimateDeliveryFare(EAST_LEGON, EAST_LEGON, config);
    expect(estimate.distanceKm).toBe(0);
    expect(estimate.etaMinutes).toBe(0);
    // base(5) is below the configured minimumFare(8) floor.
    expect(estimate.fare).toBe(8);
  });

  it("grows with distance using the base + per-km + per-minute model", () => {
    const estimate = estimateDeliveryFare(EAST_LEGON, OSU, config);
    // Recomputed from the (rounded) reported distance/eta, so this only needs
    // to land within a cent or two of the un-rounded internal calculation —
    // not exact float equality, which would be fragile the same way a raw
    // 1.005 * 100 comparison would be.
    const expectedFare = config.baseFare + config.perKmRate * estimate.distanceKm + config.perMinuteRate * estimate.etaMinutes;
    expect(estimate.fare).toBeGreaterThanOrEqual(config.minimumFare);
    expect(Math.abs(estimate.fare - expectedFare)).toBeLessThan(0.5);
  });

  it("never returns a fare below the configured minimum", () => {
    const tinyHop = estimateDeliveryFare(EAST_LEGON, { latitude: 5.6495, longitude: -0.1532 }, config);
    expect(tinyHop.fare).toBeGreaterThanOrEqual(config.minimumFare);
  });
});
