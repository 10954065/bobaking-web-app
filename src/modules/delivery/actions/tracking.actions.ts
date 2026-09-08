"use server";

import { prisma } from "@/db/client";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasPermission } from "@/modules/auth/services/authorization.service";
import { getDeliveryNavigation, NavigationUnavailableError, type DeliveryNavigation } from "@/modules/delivery/services/delivery-navigation.service";

const LIVE_TRACKABLE_STATUSES = new Set(["ASSIGNED_TO_RIDER", "PICKED_UP", "OUT_FOR_DELIVERY"]);

async function safeGetNavigation(orderId: string): Promise<DeliveryNavigation | null> {
  try {
    return await getDeliveryNavigation(orderId);
  } catch (error) {
    if (error instanceof NavigationUnavailableError) return null;
    throw error;
  }
}

/**
 * The guest customer's periodic route refresh (see routing.service.ts's
 * shouldRecalculateRoute) — gated by the same trackingToken as the SSE
 * location feed and the /track/[token] page itself, never by orderId alone.
 */
export async function getPublicNavigationAction(trackingToken: string): Promise<DeliveryNavigation | null> {
  const order = await prisma.order.findUnique({ where: { trackingToken }, select: { id: true, status: true } });
  if (!order || !LIVE_TRACKABLE_STATUSES.has(order.status)) return null;
  return safeGetNavigation(order.id);
}

async function requireDeliveryReadAccess(orderId: string): Promise<{ branchId: string }> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { branchId: true } });
  const profile = await getUserAccessProfile(userId);
  if (!hasPermission(profile, "delivery", "read", order.branchId)) {
    throw new Error("Not permitted to view this delivery.");
  }
  return order;
}

/** Admin/staff route refresh for the delivery-monitoring board — gated by the same `delivery.read` permission as the board and its SSE feed. */
export async function getAdminDeliveryNavigationAction(orderId: string): Promise<DeliveryNavigation | null> {
  await requireDeliveryReadAccess(orderId);
  return safeGetNavigation(orderId);
}

export interface DeliveryMapPoints {
  branchCoordinates: { latitude: number; longitude: number } | null;
  customerCoordinates: { latitude: number; longitude: number } | null;
}

/** Both fixed endpoints (not just the current leg's destination) so the admin map can show restaurant + customer + rider together, same as the customer's own tracking view. */
export async function getAdminDeliveryPointsAction(orderId: string): Promise<DeliveryMapPoints> {
  await requireDeliveryReadAccess(orderId);

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { branch: true, deliveryAddress: true },
  });

  return {
    branchCoordinates:
      order.branch.latitude != null && order.branch.longitude != null
        ? { latitude: Number(order.branch.latitude), longitude: Number(order.branch.longitude) }
        : null,
    customerCoordinates:
      order.deliveryAddress?.latitude != null && order.deliveryAddress?.longitude != null
        ? { latitude: Number(order.deliveryAddress.latitude), longitude: Number(order.deliveryAddress.longitude) }
        : null,
  };
}
