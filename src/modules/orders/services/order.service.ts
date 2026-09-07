import { prisma } from "@/db/client";
import { Prisma, type Order, type OrderStatus } from "@prisma/client";
import { canTransition, InvalidOrderTransitionError } from "@/modules/orders/services/order-state-machine";
import { recordAuditLog } from "@/modules/audit/services/audit.service";
import { publishKitchenEvent } from "@/modules/kitchen/services/kitchen-events";

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
    include: { customer: true, branch: true, items: true },
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 50,
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

  return updated;
}
