"use server";

import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requirePermission } from "@/modules/auth/services/authorization.service";
import {
  listAssignedDeliveriesForRider,
  riderMarkPickedUp,
  riderMarkDelivered,
  getRiderEarningsToday,
  getActiveAssignedOrderId,
  listCompletedDeliveriesForRider,
  getRiderDeliveryStats,
  type RiderDeliveryHistoryEntry,
} from "@/modules/delivery/services/delivery-order.service";
import { getRiderProfileByUserId, setRiderStatus, updateRiderLocation } from "@/modules/delivery/services/rider.service";
import type { LocationPingInput } from "@/modules/delivery/schemas/rider.schema";
import { publishDeliveryEvent } from "@/modules/delivery/services/delivery-events";
import { recordDeliveryLocation } from "@/modules/delivery/services/delivery-location.service";
import { publishDeliveryLocationEvent } from "@/modules/delivery/services/delivery-location-events";
import { getDeliveryNavigation, NavigationUnavailableError, type DeliveryNavigation } from "@/modules/delivery/services/delivery-navigation.service";
import { enforceRateLimit } from "@/lib/rate-limit";
import { withSafeErrors } from "@/lib/errors";

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

export const getMyDeliveriesAction = withSafeErrors(async (): Promise<RiderDeliveryOrder[]> => {
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
      : "No address",
    addressLine2: order.deliveryAddress?.addressLine2 ?? null,
    landmark: order.deliveryAddress?.landmark ?? null,
    total: Number(order.total),
    deliveryFee: Number(order.deliveryFee),
    itemCount: order.items.length,
  }));
}, "Couldn't load your deliveries right now. Please try again.");

export const getRiderEarningsSummaryAction = withSafeErrors(async (): Promise<RiderEarningsSummary> => {
  const userId = await requireUserId();
  await requireRiderProfile(userId);
  return getRiderEarningsToday(userId);
}, "Couldn't load your earnings right now. Please try again.");

export interface RiderDeliveryHistory {
  totalDeliveries: number;
  totalEarned: number;
  entries: RiderDeliveryHistoryEntry[];
}

/** The rider's own delivery history/stats — riderId is always the authenticated session, never client-supplied. */
export const getRiderDeliveryHistoryAction = withSafeErrors(async (): Promise<RiderDeliveryHistory> => {
  const userId = await requireUserId();
  await requireRiderProfile(userId);
  const [stats, entries] = await Promise.all([getRiderDeliveryStats(userId), listCompletedDeliveriesForRider(userId)]);
  return { ...stats, entries };
}, "Couldn't load your delivery history right now. Please try again.");

export const toggleAvailabilityAction = withSafeErrors(async (goOnline: boolean): Promise<RiderStatusSummary> => {
  const userId = await requireUserId();
  const profile = await requireRiderProfile(userId);
  const updated = await setRiderStatus(userId, goOnline ? "AVAILABLE" : "OFFLINE");
  await publishDeliveryEvent(profile.branchId, { type: "rider.status_changed", riderId: userId }).catch(() => {});
  return { status: updated.status };
}, "Couldn't update your availability right now. Please try again.");

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
export const pingLocationAction = withSafeErrors(async (input: LocationPingInput): Promise<LocationPingResult> => {
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
}, "Couldn't update your location right now. Please try again.");

export const getRiderNavigationAction = withSafeErrors(async (orderId: string): Promise<DeliveryNavigation | null> => {
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
}, "Couldn't load navigation right now. Please try again.");

export const markPickedUpAction = withSafeErrors(async (orderId: string): Promise<void> => {
  const userId = await requireUserId();
  await requireRiderProfile(userId);
  await riderMarkPickedUp(orderId, userId, userId);
}, "Couldn't mark this order picked up right now. Please try again.");

export const markDeliveredAction = withSafeErrors(async (orderId: string, code: string): Promise<void> => {
  const userId = await requireUserId();
  await requireRiderProfile(userId);
  await riderMarkDelivered(orderId, userId, userId, code);
}, "Couldn't mark this order delivered right now. Please try again.");
