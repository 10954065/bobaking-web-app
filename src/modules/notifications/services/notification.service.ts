import { prisma } from "@/db/client";
import type { NotificationChannel, Order, OrderStatus } from "@prisma/client";
import { recordAuditLog } from "@/modules/audit/services/audit.service";

const TEMPLATES: Partial<Record<OrderStatus, (order: Order) => { subject: string; body: string }>> = {
  CONFIRMED: (order) => ({
    subject: "Order confirmed",
    body: `Your order ${order.orderNumber} has been confirmed and is being prepared.`,
  }),
  READY: (order) => ({
    subject: "Order ready",
    body: `Your order ${order.orderNumber} is ready${order.type === "DELIVERY" ? " for dispatch" : " for pickup"}.`,
  }),
  OUT_FOR_DELIVERY: (order) => ({
    subject: "Order out for delivery",
    body: `Your order ${order.orderNumber} is on its way.`,
  }),
  DELIVERED: (order) => ({
    subject: "Order delivered",
    body: `Your order ${order.orderNumber} has been delivered. Enjoy!`,
  }),
  CANCELLED: (order) => ({
    subject: "Order cancelled",
    body: `Your order ${order.orderNumber} has been cancelled.`,
  }),
  REJECTED: (order) => ({
    subject: "Order could not be accepted",
    body: `We're sorry, your order ${order.orderNumber} could not be accepted.`,
  }),
};

/**
 * Dev-stub send: no real SMS/email gateway is wired up (same posture as the
 * Mobile Money payment provider in payment.service.ts) — writing a
 * Notification row IS the "send". Called from transitionOrder() after a real
 * status change commits; never throws, since a notification failure must
 * never be mistaken for (or roll back) an order status change, same
 * reasoning transitionOrder already documents for the kitchen event publish.
 */
export async function notifyOrderStatus(order: Order): Promise<void> {
  const template = TEMPLATES[order.status];
  if (!template) return;

  try {
    const customer = await prisma.customer.findUniqueOrThrow({ where: { id: order.customerId } });
    const channel: NotificationChannel | null = customer.phone ? "SMS" : customer.email ? "EMAIL" : null;
    if (!channel) return;

    const { subject, body } = template(order);
    await prisma.notification.create({
      data: { customerId: order.customerId, orderId: order.id, channel, subject, body },
    });
  } catch (error) {
    await recordAuditLog({
      actorUserId: null,
      action: "notification.send_failed",
      resourceType: "Order",
      resourceId: order.id,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    }).catch(() => {});
  }
}

export async function listNotifications(params: { limit?: number } = {}) {
  return prisma.notification.findMany({
    include: { customer: true, order: { include: { branch: true } } },
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 100,
  });
}
