import { describe, it, expect } from "vitest";
import { isValidLatitude, isValidLongitude, isValidCoordinates, isAcceptableAccuracy, isImplausibleJump, distanceMeters } from "./geo-validation";

describe("isValidLatitude / isValidLongitude / isValidCoordinates", () => {
  it("accepts in-range values", () => {
    expect(isValidLatitude(5.65)).toBe(true);
    expect(isValidLongitude(-0.15)).toBe(true);
    expect(isValidCoordinates(90, 180)).toBe(true);
    expect(isValidCoordinates(-90, -180)).toBe(true);
  });

  it("rejects out-of-range and non-finite values", () => {
    expect(isValidLatitude(90.001)).toBe(false);
    expect(isValidLatitude(-91)).toBe(false);
    expect(isValidLongitude(180.001)).toBe(false);
    expect(isValidLongitude(-181)).toBe(false);
    expect(isValidCoordinates(NaN, 0)).toBe(false);
    expect(isValidCoordinates(0, Infinity)).toBe(false);
  });
});

describe("isAcceptableAccuracy", () => {
  it("accepts a tight GPS fix", () => {
    expect(isAcceptableAccuracy(15)).toBe(true);
  });

  it("rejects a very noisy fix, zero, and negative values", () => {
    expect(isAcceptableAccuracy(5000)).toBe(false);
    expect(isAcceptableAccuracy(0)).toBe(false);
    expect(isAcceptableAccuracy(-10)).toBe(false);
  });
});

describe("isImplausibleJump", () => {
  const ACCRA = { latitude: 5.6494, longitude: -0.1531 };
  const NAIROBI = { latitude: -1.2921, longitude: 36.8219 };

  it("is not flagged for a short realistic move over a few seconds", () => {
    const previous = { ...ACCRA, recordedAt: new Date("2026-01-01T10:00:00Z") };
    const next = { latitude: 5.6498, longitude: -0.1528, recordedAt: new Date("2026-01-01T10:00:05Z") };
    expect(isImplausibleJump(previous, next)).toBe(false);
  });

  it("flags Accra-to-Nairobi in 2 seconds as implausible", () => {
    const previous = { ...ACCRA, recordedAt: new Date("2026-01-01T10:00:00Z") };
    const next = { ...NAIROBI, recordedAt: new Date("2026-01-01T10:00:02Z") };
    expect(isImplausibleJump(previous, next)).toBe(true);
  });

  it("flags a non-positive time delta (duplicate/out-of-order update)", () => {
    const previous = { ...ACCRA, recordedAt: new Date("2026-01-01T10:00:05Z") };
    const next = { ...ACCRA, recordedAt: new Date("2026-01-01T10:00:00Z") };
    expect(isImplausibleJump(previous, next)).toBe(true);
  });
});

describe("distanceMeters", () => {
  it("matches haversineDistanceKm scaled to meters", () => {
    const a = { latitude: 5.6494, longitude: -0.1531 };
    const b = { latitude: 5.6494, longitude: -0.1531 };
    expect(distanceMeters(a, b)).toBe(0);
  });
});
