import { prisma } from "@/db/client";
import { isValidCoordinates, isAcceptableAccuracy, isImplausibleJump } from "@/modules/delivery/services/geo-validation";

export class InvalidLocationError extends Error {
  constructor(message = "Invalid location data.") {
    super(message);
    this.name = "InvalidLocationError";
  }
}

export interface LocationUpdateInput {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy: number;
  recordedAt: Date;
}

export interface DeliveryLocationSnapshot {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number;
  recordedAt: string;
}

function toSnapshot(row: {
  latitude: unknown;
  longitude: unknown;
  heading: unknown;
  speed: unknown;
  accuracy: unknown;
  recordedAt: Date;
}): DeliveryLocationSnapshot {
  return {
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    heading: row.heading != null ? Number(row.heading) : null,
    speed: row.speed != null ? Number(row.speed) : null,
    accuracy: Number(row.accuracy),
    recordedAt: row.recordedAt.toISOString(),
  };
}

/**
 * Upserts the *current* location for one order's active delivery (see the
 * DeliveryLocation model doc comment — one row per order, never a growing
 * history). A structurally invalid coordinate throws (the caller sent
 * garbage); a too-noisy fix or an implausible jump vs. the last stored fix
 * is silently dropped — returns null — rather than erroring, since a rider
 * walking under a bridge for a few seconds shouldn't break their app, it
 * should just not move the marker for that one ping.
 */
export async function recordDeliveryLocation(
  orderId: string,
  riderId: string,
  input: LocationUpdateInput
): Promise<DeliveryLocationSnapshot | null> {
  if (!isValidCoordinates(input.latitude, input.longitude)) {
    throw new InvalidLocationError("Latitude/longitude out of range.");
  }
  if (!isAcceptableAccuracy(input.accuracy)) {
    return null;
  }

  const existing = await prisma.deliveryLocation.findUnique({ where: { orderId } });
  if (
    existing &&
    isImplausibleJump(
      { latitude: Number(existing.latitude), longitude: Number(existing.longitude), recordedAt: existing.recordedAt },
      { latitude: input.latitude, longitude: input.longitude, recordedAt: input.recordedAt }
    )
  ) {
    return null;
  }

  const saved = await prisma.deliveryLocation.upsert({
    where: { orderId },
    create: {
      orderId,
      riderId,
      latitude: input.latitude,
      longitude: input.longitude,
      heading: input.heading ?? null,
      speed: input.speed ?? null,
      accuracy: input.accuracy,
      recordedAt: input.recordedAt,
    },
    update: {
      riderId,
      latitude: input.latitude,
      longitude: input.longitude,
      heading: input.heading ?? null,
      speed: input.speed ?? null,
      accuracy: input.accuracy,
      recordedAt: input.recordedAt,
    },
  });

  return toSnapshot(saved);
}

export async function getDeliveryLocation(orderId: string): Promise<DeliveryLocationSnapshot | null> {
  const row = await prisma.deliveryLocation.findUnique({ where: { orderId } });
  return row ? toSnapshot(row) : null;
}

/** Called once a delivery reaches a state where it should no longer be trackable — see order.service.ts's transitionOrder. Deleting (not just hiding) the row is deliberate: there is no history feature, so a stale current-location row for a finished order should not linger in the database at all. */
export async function clearDeliveryLocation(orderId: string): Promise<void> {
  await prisma.deliveryLocation.deleteMany({ where: { orderId } });
}
