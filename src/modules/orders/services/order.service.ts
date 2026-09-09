import { prisma } from "@/db/client";
import { Prisma, type Order, type OrderStatus } from "@prisma/client";
import { canTransition, InvalidOrderTransitionError } from "@/modules/orders/services/order-state-machine";
import { recordAuditLog } from "@/modules/audit/services/audit.service";
import { publishKitchenEvent } from "@/modules/kitchen/services/kitchen-events";
import { notifyOrderStatus } from "@/modules/notifications/services/notification.service";
import { clearDeliveryLocation } from "@/modules/delivery/services/delivery-location.service";
import { publishDeliveryLocationEvent } from "@/modules/delivery/services/delivery-location-events";
import { publishOrderStatusEvent } from "@/modules/orders/services/order-status-events";

/** Once an order reaches one of these, live GPS tracking must stop — see the DeliveryLocation model doc comment and Phase 5 of the tracking module. */
const TRACKING_STOPS_AT = new Set(["DELIVERED", "CANCELLED", "REJECTED"]);

const orderWithDetails = Prisma.validator<Prisma.OrderDefaultArgs>()({
  include: {
    items: { include: { modifiers: true } },
    statusHistory: { orderBy: { createdAt: "asc" } },
    payments: { include: { refunds: true } },
    customer: true,
    deliveryAddress: true,
    branch: true,
  },
});
export type OrderWithDetails = Prisma.OrderGetPayload<typeof orderWithDetails>;

export async function getOrderById(id: string): Promise<OrderWithDetails | null> {
  return prisma.order.findUnique({ where: { id }, ...orderWithDetails });
}

export async function getOrderByIdempotencyKey(idempotencyKey: string): Promise<Order | null> {
  return prisma.order.findUnique({ where: { idempotencyKey } });
}

export async function listOrdersForBranch(
  branchIds: "ALL" | string[],
  params: { status?: OrderStatus; limit?: number } = {}
) {
  return prisma.order.findMany({
    where: {
      branchId: branchIds === "ALL" ? undefined : { in: branchIds },
      status: params.status,
    },
    include: { customer: true, branch: true, items: true, payments: { include: { refunds: true } } },
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 50,
  });
}

/** A customer's full order history — the CRM 360 view (see /admin/customers/[customerId]). */
export async function listOrdersForCustomer(customerId: string, limit = 20) {
  return prisma.order.findMany({
    where: { customerId },
    include: { branch: true, items: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * The only way an order's status changes. Validates the transition, updates
 * the row, appends to OrderStatusHistory, and writes an audit log — all in
 * one transaction, so a partially-recorded transition can never happen.
 */
export async function transitionOrder(params: {
  orderId: string;
  toStatus: OrderStatus;
  actorUserId: string | null;
  reason?: string;
}): Promise<Order> {
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: params.orderId } });

    if (!canTransition(order.status, params.toStatus)) {
      throw new InvalidOrderTransitionError(order.status, params.toStatus);
    }

    const updatedOrder = await tx.order.update({
      where: { id: params.orderId },
      data: { status: params.toStatus },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: params.orderId,
        fromStatus: order.status,
        toStatus: params.toStatus,
        changedByUserId: params.actorUserId,
        reason: params.reason,
      },
    });

    await recordAuditLog({
      actorUserId: params.actorUserId,
      action: "order.status_changed",
      resourceType: "Order",
      resourceId: params.orderId,
      branchId: order.branchId,
      before: { status: order.status },
      after: { status: params.toStatus },
    });

    return updatedOrder;
  });

  // Publish after the transaction commits — a Redis hiccup must never roll
  // back a real order status change, and holding the DB transaction open
  // across a network call to Redis would extend lock time for no benefit.
  const eventType = params.toStatus === "SENT_TO_KITCHEN" ? "order.new" : "order.updated";
  await publishKitchenEvent(updated.branchId, { type: eventType, orderId: updated.id }).catch(() => {});

  // Same "never load-bearing" posture — notifyOrderStatus already never
  // throws, but the .catch() is cheap insurance against that invariant ever slipping.
  await notifyOrderStatus(updated).catch(() => {});

  // Every transition, whole-lifecycle — what the customer tracking page's
  // live watcher subscribes to (see order-status-events.ts's doc comment).
  await publishOrderStatusEvent(updated.id, { type: "order.status_changed", status: updated.status }).catch(() => {});

  // Live location tracking is status-gated: every consumer (customer,
  // staff, admin) must stop receiving GPS the moment a delivery is no
  // longer active, regardless of which transition got it there.
  if (TRACKING_STOPS_AT.has(updated.status)) {
    await clearDeliveryLocation(updated.id);
    await publishDeliveryLocationEvent(updated.id, { type: "tracking.stopped" }).catch(() => {});
  } else {
    await publishDeliveryLocationEvent(updated.id, { type: "status.changed", status: updated.status }).catch(() => {});
  }

  return updated;
}
