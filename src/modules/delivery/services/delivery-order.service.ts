import { prisma } from "@/db/client";
import { transitionOrder } from "@/modules/orders/services/order.service";
import { canTransition } from "@/modules/orders/services/order-state-machine";
import { publishDeliveryEvent } from "@/modules/delivery/services/delivery-events";
import { setRiderStatus } from "@/modules/delivery/services/rider.service";

export class NotAssignedToRiderError extends Error {
  constructor() {
    super("This delivery is not assigned to you.");
    this.name = "NotAssignedToRiderError";
  }
}

/** READY delivery orders with no rider yet — what the admin board offers up for assignment. */
export async function listReadyForDeliveryOrders(branchId: string) {
  return prisma.order.findMany({
    where: { branchId, type: "DELIVERY", status: "READY", assignedRiderId: null },
    include: { customer: true, deliveryAddress: true, items: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function listActiveDeliveriesForBranch(branchId: string) {
  return prisma.order.findMany({
    where: { branchId, type: "DELIVERY", status: { in: ["ASSIGNED_TO_RIDER", "PICKED_UP", "OUT_FOR_DELIVERY"] } },
    include: { customer: true, deliveryAddress: true, assignedRider: true, items: true },
    orderBy: { riderAssignedAt: "asc" },
  });
}

export async function listAssignedDeliveriesForRider(riderUserId: string) {
  return prisma.order.findMany({
    where: { assignedRiderId: riderUserId, status: { in: ["ASSIGNED_TO_RIDER", "PICKED_UP", "OUT_FOR_DELIVERY"] } },
    include: { customer: true, deliveryAddress: true, items: true },
    orderBy: { riderAssignedAt: "asc" },
  });
}

async function requireOrderAssignedToRider(orderId: string, riderUserId: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.assignedRiderId !== riderUserId) {
    throw new NotAssignedToRiderError();
  }
  return order;
}

export async function assignRiderToOrder(orderId: string, riderUserId: string, actorUserId: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.assignedRiderId) {
    throw new Error("This order already has a rider assigned.");
  }
  if (!canTransition(order.status, "ASSIGNED_TO_RIDER")) {
    throw new Error(`Cannot assign a rider to an order in ${order.status} status.`);
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { assignedRiderId: riderUserId, riderAssignedAt: new Date() },
  });
  await setRiderStatus(riderUserId, "ON_DELIVERY");
  const updated = await transitionOrder({
    orderId,
    toStatus: "ASSIGNED_TO_RIDER",
    actorUserId,
    reason: "Rider assigned",
  });

  await publishDeliveryEvent(order.branchId, { type: "order.assigned", orderId, riderId: riderUserId }).catch(() => {});
  return updated;
}

/**
 * A single "picked up" tap from the rider covers both leaving the branch and
 * starting the delivery leg (PICKED_UP -> OUT_FOR_DELIVERY is auto-chained,
 * same pattern as sendToKitchenAction in Phase 4) — a rider on their phone
 * doesn't need two separate taps for what's one continuous action.
 */
export async function riderMarkPickedUp(orderId: string, riderUserId: string, actorUserId: string) {
  const order = await requireOrderAssignedToRider(orderId, riderUserId);

  if (canTransition(order.status, "PICKED_UP")) {
    await transitionOrder({ orderId, toStatus: "PICKED_UP", actorUserId, reason: "Rider picked up from branch" });
  }
  const afterPickup = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (canTransition(afterPickup.status, "OUT_FOR_DELIVERY")) {
    await transitionOrder({ orderId, toStatus: "OUT_FOR_DELIVERY", actorUserId, reason: "Out for delivery" });
  }

  await publishDeliveryEvent(order.branchId, { type: "order.updated", orderId }).catch(() => {});
}

export async function riderMarkDelivered(orderId: string, riderUserId: string, actorUserId: string) {
  const order = await requireOrderAssignedToRider(orderId, riderUserId);

  if (canTransition(order.status, "DELIVERED")) {
    await transitionOrder({ orderId, toStatus: "DELIVERED", actorUserId, reason: "Delivered to customer" });
  }
  await setRiderStatus(riderUserId, "AVAILABLE");

  await publishDeliveryEvent(order.branchId, { type: "order.updated", orderId }).catch(() => {});
}
