"use server";

import { prisma } from "@/db/client";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requirePermission } from "@/modules/auth/services/authorization.service";
import {
  startOrderItem,
  markOrderItemReady,
  listKitchenQueueForBranch,
  toKdsOrder,
  type KdsOrderWithItems,
} from "@/modules/kitchen/services/kitchen-order.service";

async function requireBranchOfOrderItem(orderItemId: string, userId: string, action: "read" | "update") {
  const item = await prisma.orderItem.findUniqueOrThrow({
    where: { id: orderItemId },
    include: { order: { select: { branchId: true } } },
  });
  await requirePermission(userId, "kitchen", action, item.order.branchId);
  return item.order.branchId;
}

export async function startItemAction(orderItemId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  await requireBranchOfOrderItem(orderItemId, userId, "update");
  await startOrderItem(orderItemId, userId);
}

export async function markItemReadyAction(orderItemId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  await requireBranchOfOrderItem(orderItemId, userId, "update");
  await markOrderItemReady(orderItemId, userId);
}

export async function getKitchenQueueAction(branchId: string): Promise<KdsOrderWithItems[]> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  await requirePermission(userId, "kitchen", "read", branchId);
  const orders = await listKitchenQueueForBranch(branchId);
  return orders.map(toKdsOrder);
}
