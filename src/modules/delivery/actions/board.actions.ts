"use server";

import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requirePermission } from "@/modules/auth/services/authorization.service";
import { prisma } from "@/db/client";
import { UserFacingError, withSafeErrors } from "@/lib/errors";
import {
  listReadyForDeliveryOrders,
  listActiveDeliveriesForBranch,
  assignRiderToOrder,
} from "@/modules/delivery/services/delivery-order.service";
import { listRidersForBranch, getRiderProfileByUserId } from "@/modules/delivery/services/rider.service";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export interface DeliveryBoardOrder {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  addressLabel: string;
  total: number;
  itemCount: number;
  assignedRiderName: string | null;
  createdAt: string;
}

export interface DeliveryBoardRider {
  userId: string;
  name: string;
  status: string;
  lastLocationAt: string | null;
}

export interface DeliveryBoardData {
  ready: DeliveryBoardOrder[];
  active: DeliveryBoardOrder[];
  riders: DeliveryBoardRider[];
}

function addressLabel(address: { addressLine1: string; area: string | null } | null): string {
  if (!address) return "No address";
  return address.area ? `${address.addressLine1}, ${address.area}` : address.addressLine1;
}

export const getDeliveryBoardAction = withSafeErrors(async (branchId: string): Promise<DeliveryBoardData> => {
  const userId = await requireUserId();
  await requirePermission(userId, "delivery", "read", branchId);

  const [ready, active, riders] = await Promise.all([
    listReadyForDeliveryOrders(branchId),
    listActiveDeliveriesForBranch(branchId),
    listRidersForBranch(branchId),
  ]);

  return {
    ready: ready.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      addressLabel: addressLabel(order.deliveryAddress),
      total: Number(order.total),
      itemCount: order.items.length,
      assignedRiderName: null,
      createdAt: order.createdAt.toISOString(),
    })),
    active: active.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      addressLabel: addressLabel(order.deliveryAddress),
      total: Number(order.total),
      itemCount: order.items.length,
      assignedRiderName: order.assignedRider ? `${order.assignedRider.firstName} ${order.assignedRider.lastName}` : null,
      createdAt: order.createdAt.toISOString(),
    })),
    riders: riders.map((rider) => ({
      userId: rider.userId,
      name: `${rider.user.firstName} ${rider.user.lastName}`,
      status: rider.status,
      lastLocationAt: rider.lastLocationAt?.toISOString() ?? null,
    })),
  };
}, "Couldn't load the delivery board right now. Please try again.");

export const assignRiderToOrderAction = withSafeErrors(async (orderId: string, riderUserId: string): Promise<void> => {
  const userId = await requireUserId();
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { branchId: true } });
  await requirePermission(userId, "delivery", "assign", order.branchId);

  // A rider can only be assigned to orders at their own branch — otherwise a
  // BRANCH_MANAGER/FRONT_DESK could point a customer's delivery at a rider
  // who isn't actually based there.
  const riderProfile = await getRiderProfileByUserId(riderUserId);
  if (!riderProfile || riderProfile.branchId !== order.branchId) {
    throw new UserFacingError("That rider isn't available at this branch.");
  }

  await assignRiderToOrder(orderId, riderUserId, userId);
}, "Couldn't assign that rider right now. Please try again.");
