"use server";

import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requirePermission } from "@/modules/auth/services/authorization.service";
import {
  listAssignedDeliveriesForRider,
  riderMarkPickedUp,
  riderMarkDelivered,
  getRiderEarningsToday,
  getActiveAssignedOrderId,
} from "@/modules/delivery/services/delivery-order.service";
import { getRiderProfileByUserId, setRiderStatus, updateRiderLocation } from "@/modules/delivery/services/rider.service";
import type { LocationPingInput } from "@/modules/delivery/schemas/rider.schema";
import { publishDeliveryEvent } from "@/modules/delivery/services/delivery-events";
import { recordDeliveryLocation } from "@/modules/delivery/services/delivery-location.service";
import { publishDeliveryLocationEvent } from "@/modules/delivery/services/delivery-location-events";
import { getDeliveryNavigation, NavigationUnavailableError, type DeliveryNavigation } from "@/modules/delivery/services/delivery-navigation.service";
import { enforceRateLimit } from "@/lib/rate-limit";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

async function requireRiderProfile(userId: string) {
  const profile = await getRiderProfileByUserId(userId);
  if (!profile) throw new Error("No rider profile for this account.");
  await requirePermission(userId, "delivery", "update", profile.branchId);
  return profile;
}

export interface RiderDeliveryOrder {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone: string | null;
  addressLabel: string;
  addressLine2: string | null;
  landmark: string | null;
  total: number;
  deliveryFee: number;
  itemCount: number;
}

export interface RiderStatusSummary {
  status: string;
}

export interface RiderEarningsSummary {
  deliveriesToday: number;
  earningsToday: number;
}

export async function getMyDeliveriesAction(): Promise<RiderDeliveryOrder[]> {
  const userId = await requireUserId();
  await requireRiderProfile(userId);

  const orders = await listAssignedDeliveriesForRider(userId);
  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customerName: `${order.customer.firstName} ${order.customer.lastName}`,
    customerPhone: order.customer.phone,
    addressLabel: order.deliveryAddress
      ? order.deliveryAddress.area
        ? `${order.deliveryAddress.addressLine1}, ${order.deliveryAddress.area}`
        : order.deliveryAddress.addressLine1
      : "—",
    addressLine2: order.deliveryAddress?.addressLine2 ?? null,
    landmark: order.deliveryAddress?.landmark ?? null,
    total: Number(order.total),
    deliveryFee: Number(order.deliveryFee),
    itemCount: order.items.length,
  }));
}

export async function getRiderEarningsSummaryAction(): Promise<RiderEarningsSummary> {
  const userId = await requireUserId();
  await requireRiderProfile(userId);
  return getRiderEarningsToday(userId);
}

export async function toggleAvailabilityAction(goOnline: boolean): Promise<RiderStatusSummary> {
  const userId = await requireUserId();
  const profile = await requireRiderProfile(userId);
  const updated = await setRiderStatus(userId, goOnline ? "AVAILABLE" : "OFFLINE");
  await publishDeliveryEvent(profile.branchId, { type: "rider.status_changed", riderId: userId }).catch(() => {});
  return { status: updated.status };
}

export interface LocationPingResult {
  /** False when the fix was too inaccurate or an implausible jump and was therefore dropped — the rider's marker did not move. Never a hard error; the app should just show a quality hint. */
  accepted: boolean;
}

/**
 * Throttled/threshold-based on the client (see useRiderLocationTracker) —
 * this still rate-limits server-side because the client can't be trusted to
 * actually behave (a compromised/modified client, or a bug) and a runaway
 * ping loop must not be able to hammer the database or Redis.
 */
export async function pingLocationAction(input: LocationPingInput): Promise<LocationPingResult> {
  const userId = await requireUserId();
  const profile = await requireRiderProfile(userId);

  await enforceRateLimit(`location-ping:${userId}`, { limit: 30, windowSeconds: 60 });

  await updateRiderLocation(userId, input);
  await publishDeliveryEvent(profile.branchId, { type: "rider.location_updated", riderId: userId }).catch(() => {});

  // Deriving the order server-side (never trusting an orderId from the
  // client) means a rider can only ever write location data for the
  // delivery they are actually, currently assigned to.
  const activeOrderId = await getActiveAssignedOrderId(userId);
  if (!activeOrderId) return { accepted: true };

  const recorded = await recordDeliveryLocation(activeOrderId, userId, {
    latitude: input.latitude,
    longitude: input.longitude,
    heading: input.heading ?? null,
    speed: input.speed ?? null,
    accuracy: input.accuracy,
    recordedAt: new Date(input.timestamp),
  });

  if (recorded) {
    await publishDeliveryLocationEvent(activeOrderId, { type: "location.updated", ...recorded }).catch(() => {});
  }
  return { accepted: recorded !== null };
}

export async function getRiderNavigationAction(orderId: string): Promise<DeliveryNavigation | null> {
  const userId = await requireUserId();
  await requireRiderProfile(userId);

  const order = await getActiveAssignedOrderId(userId);
  if (order !== orderId) throw new Error("This delivery is not assigned to you.");

  try {
    return await getDeliveryNavigation(orderId);
  } catch (error) {
    if (error instanceof NavigationUnavailableError) return null;
    throw error;
  }
}

export async function markPickedUpAction(orderId: string): Promise<void> {
  const userId = await requireUserId();
  await requireRiderProfile(userId);
  await riderMarkPickedUp(orderId, userId, userId);
}

export async function markDeliveredAction(orderId: string, code: string): Promise<void> {
  const userId = await requireUserId();
  await requireRiderProfile(userId);
  await riderMarkDelivered(orderId, userId, userId, code);
}
