import { prisma } from "@/db/client";
import { transitionOrder } from "@/modules/orders/services/order.service";
import { canTransition } from "@/modules/orders/services/order-state-machine";
import { publishDeliveryEvent } from "@/modules/delivery/services/delivery-events";
import { setRiderStatus } from "@/modules/delivery/services/rider.service";
import { enforceRateLimit } from "@/lib/rate-limit";

export class NotAssignedToRiderError extends Error {
  constructor() {
    super("This delivery is not assigned to you.");
    this.name = "NotAssignedToRiderError";
  }
}

export class InvalidDeliveryCodeError extends Error {
  constructor() {
    super("That code doesn't match. Ask the customer to read it out again.");
    this.name = "InvalidDeliveryCodeError";
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

/** The one order (if any) this rider is actively navigating right now — used to route a GPS ping to the right DeliveryLocation row without trusting an orderId the client might supply. */
export async function getActiveAssignedOrderId(riderUserId: string): Promise<string | null> {
  const order = await prisma.order.findFirst({
    where: { assignedRiderId: riderUserId, status: { in: ["ASSIGNED_TO_RIDER", "PICKED_UP", "OUT_FOR_DELIVERY"] } },
    orderBy: { riderAssignedAt: "desc" },
    select: { id: true },
  });
  return order?.id ?? null;
}

/**
 * "How much am I making" for a rider: every order this rider personally
 * marked DELIVERED today earns them that order's deliveryFee (the codebase
 * has no separate rider-commission-percentage concept yet, so the full fee
 * is the honest number to show rather than inventing a split). Keyed off
 * OrderStatusHistory (changedByUserId is the rider on riderMarkDelivered)
 * rather than Order.updatedAt, which could later be touched by an unrelated
 * COMPLETED/REFUNDED transition and would then misreport "today".
 */
export async function getRiderEarningsToday(riderUserId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const deliveries = await prisma.orderStatusHistory.findMany({
    where: { toStatus: "DELIVERED", changedByUserId: riderUserId, createdAt: { gte: startOfToday } },
    include: { order: { select: { deliveryFee: true } } },
  });

  return {
    deliveriesToday: deliveries.length,
    earningsToday: deliveries.reduce((sum, entry) => sum + Number(entry.order.deliveryFee), 0),
  };
}

export interface RiderDeliveryHistoryEntry {
  orderId: string;
  orderNumber: string;
  customerName: string;
  addressLabel: string;
  deliveryFee: number;
  deliveredAt: Date;
}

/** Every delivery this rider has personally completed, most recent first — keyed off OrderStatusHistory (same reasoning as getRiderEarningsToday) rather than Order.updatedAt. */
export async function listCompletedDeliveriesForRider(riderUserId: string, limit = 50): Promise<RiderDeliveryHistoryEntry[]> {
  const entries = await prisma.orderStatusHistory.findMany({
    where: { toStatus: "DELIVERED", changedByUserId: riderUserId },
    include: { order: { select: { id: true, orderNumber: true, deliveryFee: true, customer: true, deliveryAddress: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return entries.map((entry) => ({
    orderId: entry.order.id,
    orderNumber: entry.order.orderNumber,
    customerName: `${entry.order.customer.firstName} ${entry.order.customer.lastName}`,
    addressLabel: entry.order.deliveryAddress
      ? entry.order.deliveryAddress.area
        ? `${entry.order.deliveryAddress.addressLine1}, ${entry.order.deliveryAddress.area}`
        : entry.order.deliveryAddress.addressLine1
      : "Pickup",
    deliveryFee: Number(entry.order.deliveryFee),
    deliveredAt: entry.createdAt,
  }));
}

/** All-time totals for this rider's profile/stats view. */
export async function getRiderDeliveryStats(riderUserId: string) {
  const delivered = await prisma.orderStatusHistory.findMany({
    where: { toStatus: "DELIVERED", changedByUserId: riderUserId },
    include: { order: { select: { deliveryFee: true } } },
  });

  return {
    totalDeliveries: delivered.length,
    totalEarned: delivered.reduce((sum, entry) => sum + Number(entry.order.deliveryFee), 0),
  };
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

/**
 * `code` is the 4-digit handoff PIN the customer reads out on arrival (see
 * checkout.service.ts). Orders placed before this feature shipped have no
 * deliveryCode — those fall back to no check at all rather than being
 * permanently undeliverable.
 */
export async function riderMarkDelivered(orderId: string, riderUserId: string, actorUserId: string, code?: string) {
  const order = await requireOrderAssignedToRider(orderId, riderUserId);

  if (order.deliveryCode) {
    // Caps brute-forcing the 4-digit handoff PIN (10,000 combinations) — the
    // rider is already legitimately assigned, but the code exists precisely
    // to require the customer's confirmation, not just proximity to the order.
    await enforceRateLimit(`delivery-code:${orderId}`, { limit: 5, windowSeconds: 600 });
    if (order.deliveryCode !== code) {
      throw new InvalidDeliveryCodeError();
    }
  }

  if (canTransition(order.status, "DELIVERED")) {
    await transitionOrder({ orderId, toStatus: "DELIVERED", actorUserId, reason: "Delivered to customer" });
  }
  if (order.deliveryCode) {
    await prisma.order.update({ where: { id: orderId }, data: { deliveryCodeVerifiedAt: new Date() } });
  }
  await setRiderStatus(riderUserId, "AVAILABLE");

  await publishDeliveryEvent(order.branchId, { type: "order.updated", orderId }).catch(() => {});
}
