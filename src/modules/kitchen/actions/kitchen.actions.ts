"use server";

import { prisma } from "@/db/client";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requirePermission } from "@/modules/auth/services/authorization.service";
import { withSafeErrors } from "@/lib/errors";
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

export const startItemAction = withSafeErrors(async (orderItemId: string): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  await requireBranchOfOrderItem(orderItemId, userId, "update");
  await startOrderItem(orderItemId, userId);
}, "Couldn't start that item right now — please try again.");

export const markItemReadyAction = withSafeErrors(async (orderItemId: string): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  await requireBranchOfOrderItem(orderItemId, userId, "update");
  await markOrderItemReady(orderItemId, userId);
}, "Couldn't mark that item ready right now — please try again.");

export const getKitchenQueueAction = withSafeErrors(async (branchId: string): Promise<KdsOrderWithItems[]> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  await requirePermission(userId, "kitchen", "read", branchId);
  const orders = await listKitchenQueueForBranch(branchId);
  return orders.map(toKdsOrder);
}, "Couldn't load the kitchen queue right now — please try again.");
