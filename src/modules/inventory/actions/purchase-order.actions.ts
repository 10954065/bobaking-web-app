"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/db/client";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requirePermission } from "@/modules/auth/services/authorization.service";
import {
  createPurchaseOrder,
  submitPurchaseOrder,
  receivePurchaseOrderItems,
  cancelPurchaseOrder,
} from "@/modules/inventory/services/purchase-order.service";
import type { CreatePurchaseOrderInput, ReceivePurchaseOrderItemsInput } from "@/modules/inventory/schemas/purchase-order.schema";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

async function requirePurchaseOrderBranchAccess(userId: string, purchaseOrderId: string) {
  const po = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: purchaseOrderId },
    select: { branchId: true },
  });
  await requirePermission(userId, "purchase_orders", "update", po.branchId);
  return po.branchId;
}

/**
 * These are called directly from client components (NewPurchaseOrderForm,
 * SubmitPurchaseOrderButton, ReceivePurchaseOrderForm, CancelPurchaseOrderButton),
 * so every return value here must be plain-serializable — the services return
 * raw Prisma rows (Decimal fields, nested ingredient/supplier/branch relations)
 * which are not, so each action below trims to an explicit plain shape rather
 * than passing the service result straight through.
 */

export interface PurchaseOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
}

/** PurchaseOrder is branch-owned — creation is checked against the branch named in the input, mutations against the order's actual branch. */
export async function createPurchaseOrderAction(input: CreatePurchaseOrderInput): Promise<PurchaseOrderSummary> {
  const userId = await requireUserId();
  await requirePermission(userId, "purchase_orders", "create", input.branchId);
  const po = await createPurchaseOrder(input, userId);
  revalidatePath("/admin/inventory/purchase-orders");
  return { id: po.id, orderNumber: po.orderNumber, status: po.status };
}

export async function submitPurchaseOrderAction(purchaseOrderId: string): Promise<PurchaseOrderSummary> {
  const userId = await requireUserId();
  await requirePurchaseOrderBranchAccess(userId, purchaseOrderId);
  const po = await submitPurchaseOrder(purchaseOrderId);
  revalidatePath(`/admin/inventory/purchase-orders/${purchaseOrderId}`);
  revalidatePath("/admin/inventory/purchase-orders");
  return { id: po.id, orderNumber: po.orderNumber, status: po.status };
}

export async function receivePurchaseOrderItemsAction(
  purchaseOrderId: string,
  input: ReceivePurchaseOrderItemsInput
): Promise<PurchaseOrderSummary> {
  const userId = await requireUserId();
  await requirePurchaseOrderBranchAccess(userId, purchaseOrderId);
  const po = await receivePurchaseOrderItems(purchaseOrderId, input, userId);
  revalidatePath(`/admin/inventory/purchase-orders/${purchaseOrderId}`);
  revalidatePath("/admin/inventory/purchase-orders");
  revalidatePath("/admin/inventory");
  return { id: po.id, orderNumber: po.orderNumber, status: po.status };
}

export async function cancelPurchaseOrderAction(purchaseOrderId: string): Promise<PurchaseOrderSummary> {
  const userId = await requireUserId();
  await requirePurchaseOrderBranchAccess(userId, purchaseOrderId);
  const po = await cancelPurchaseOrder(purchaseOrderId);
  revalidatePath(`/admin/inventory/purchase-orders/${purchaseOrderId}`);
  revalidatePath("/admin/inventory/purchase-orders");
  return { id: po.id, orderNumber: po.orderNumber, status: po.status };
}
