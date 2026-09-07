"use server";

import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requirePermission } from "@/modules/auth/services/authorization.service";
import {
  listAssignedDeliveriesForRider,
  riderMarkPickedUp,
  riderMarkDelivered,
} from "@/modules/delivery/services/delivery-order.service";
import { getRiderProfileByUserId, setRiderStatus, updateRiderLocation } from "@/modules/delivery/services/rider.service";
import type { LocationPingInput } from "@/modules/delivery/schemas/rider.schema";
import { publishDeliveryEvent } from "@/modules/delivery/services/delivery-events";

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
  itemCount: number;
}

export interface RiderStatusSummary {
  status: string;
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
    itemCount: order.items.length,
  }));
}

export async function toggleAvailabilityAction(goOnline: boolean): Promise<RiderStatusSummary> {
  const userId = await requireUserId();
  const profile = await requireRiderProfile(userId);
  const updated = await setRiderStatus(userId, goOnline ? "AVAILABLE" : "OFFLINE");
  await publishDeliveryEvent(profile.branchId, { type: "rider.status_changed", riderId: userId }).catch(() => {});
  return { status: updated.status };
}

export async function pingLocationAction(input: LocationPingInput): Promise<void> {
  const userId = await requireUserId();
  const profile = await requireRiderProfile(userId);
  await updateRiderLocation(userId, input);
  await publishDeliveryEvent(profile.branchId, { type: "rider.location_updated", riderId: userId }).catch(() => {});
}

export async function markPickedUpAction(orderId: string): Promise<void> {
  const userId = await requireUserId();
  await requireRiderProfile(userId);
  await riderMarkPickedUp(orderId, userId, userId);
}

export async function markDeliveredAction(orderId: string): Promise<void> {
  const userId = await requireUserId();
  await requireRiderProfile(userId);
  await riderMarkDelivered(orderId, userId, userId);
}
