"use server";

import { prisma } from "@/db/client";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, getAccessibleBranchIds } from "@/modules/auth/services/authorization.service";
import { withSafeErrors } from "@/lib/errors";

async function requireOrdersReadBranches() {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  const profile = await getUserAccessProfile(userId);
  if (!hasAnyPermission(profile, "orders", "read")) throw new Error("Not permitted to view orders.");
  return getAccessibleBranchIds(profile, "orders", "read");
}

export interface IncomingOrder {
  id: string;
  orderNumber: string;
  status: string;
  type: string;
  customerName: string;
  total: number;
  itemCount: number;
  createdAt: string;
  paymentId: string | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
}

/**
 * What Front Desk actually watches now that orders arrive from the public
 * storefront instead of being keyed in at a counter: payments still settling
 * (PENDING_PAYMENT) and payments that have landed but haven't been relayed
 * to the kitchen yet (CONFIRMED) — see sendToKitchenAction/confirmCashPaymentAction.
 */
export const listIncomingOrdersAction = withSafeErrors(async (): Promise<IncomingOrder[]> => {
  const branchIds = await requireOrdersReadBranches();
  const orders = await prisma.order.findMany({
    where: {
      branchId: branchIds === "ALL" ? undefined : { in: branchIds },
      status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
    },
    include: { customer: true, items: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "asc" },
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    type: order.type,
    customerName: `${order.customer.firstName} ${order.customer.lastName}`,
    total: Number(order.total),
    itemCount: order.items.length,
    createdAt: order.createdAt.toISOString(),
    paymentId: order.payments[0]?.id ?? null,
    paymentMethod: order.payments[0]?.method ?? null,
    paymentStatus: order.payments[0]?.status ?? null,
  }));
}, "Couldn't load incoming orders right now — please try again.");

export interface TodaysOrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  type: string;
  status: string;
  total: number;
  paymentMethod: string | null;
  createdAt: string;
}

export interface TodaysOrdersSummary {
  orders: TodaysOrderRow[];
  totalOrders: number;
  totalCollected: number;
  byMethod: Record<string, number>;
}

/** The end-of-day reconciliation view — every order this branch took today, and what actually got collected (cash vs mobile money), so closing out the till doesn't require cross-checking a spreadsheet. */
export const listTodaysOrdersAction = withSafeErrors(async (): Promise<TodaysOrdersSummary> => {
  const branchIds = await requireOrdersReadBranches();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: {
      branchId: branchIds === "ALL" ? undefined : { in: branchIds },
      createdAt: { gte: startOfToday },
      status: { notIn: ["DRAFT", "CANCELLED"] },
    },
    include: {
      customer: true,
      payments: { where: { status: "SUCCEEDED" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const byMethod: Record<string, number> = {};
  let totalCollected = 0;
  for (const order of orders) {
    const payment = order.payments[0];
    if (payment) {
      const amount = Number(payment.amount);
      totalCollected += amount;
      byMethod[payment.method] = (byMethod[payment.method] ?? 0) + amount;
    }
  }

  return {
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      type: order.type,
      status: order.status,
      total: Number(order.total),
      paymentMethod: order.payments[0]?.method ?? null,
      createdAt: order.createdAt.toISOString(),
    })),
    totalOrders: orders.length,
    totalCollected,
    byMethod,
  };
}, "Couldn't load today's orders right now — please try again.");
