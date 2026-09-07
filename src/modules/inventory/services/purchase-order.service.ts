import { prisma } from "@/db/client";
import { generatePoNumber } from "@/modules/inventory/services/po-number.service";
import { recordStockMovement } from "@/modules/inventory/services/stock.service";
import {
  createPurchaseOrderSchema,
  receivePurchaseOrderItemsSchema,
  type CreatePurchaseOrderInput,
  type ReceivePurchaseOrderItemsInput,
} from "@/modules/inventory/schemas/purchase-order.schema";

export class InvalidPurchaseOrderStateError extends Error {
  constructor(status: string) {
    super(`Cannot receive against a ${status} purchase order.`);
    this.name = "InvalidPurchaseOrderStateError";
  }
}

export async function listPurchaseOrders(branchIds: "ALL" | string[]) {
  return prisma.purchaseOrder.findMany({
    where: branchIds === "ALL" ? {} : { branchId: { in: branchIds } },
    include: { supplier: true, branch: true, items: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPurchaseOrderById(id: string) {
  return prisma.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true, branch: true, items: { include: { ingredient: true } } },
  });
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput, createdByUserId: string) {
  const data = createPurchaseOrderSchema.parse(input);
  const orderNumber = await generatePoNumber();
  return prisma.purchaseOrder.create({
    data: {
      orderNumber,
      branchId: data.branchId,
      supplierId: data.supplierId,
      notes: data.notes ?? null,
      createdByUserId,
      status: "DRAFT",
      items: {
        create: data.items.map((item) => ({
          ingredientId: item.ingredientId,
          quantityOrdered: item.quantityOrdered,
          unitCost: item.unitCost,
        })),
      },
    },
    include: { items: { include: { ingredient: true } }, supplier: true, branch: true },
  });
}

export async function submitPurchaseOrder(id: string) {
  return prisma.purchaseOrder.update({
    where: { id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });
}

/**
 * Receiving is the only point where a purchase order affects stock — DRAFT/
 * SUBMITTED items never touch BranchIngredientStock. Supports partial
 * receipt (a delivery short of what was ordered); status reflects whether
 * every line is now fully received.
 */
export async function receivePurchaseOrderItems(
  purchaseOrderId: string,
  input: ReceivePurchaseOrderItemsInput,
  actorUserId: string
) {
  const data = receivePurchaseOrderItemsSchema.parse(input);
  const po = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: purchaseOrderId },
    include: { items: true },
  });

  if (po.status === "RECEIVED" || po.status === "CANCELLED") {
    throw new InvalidPurchaseOrderStateError(po.status);
  }

  for (const receipt of data.items) {
    if (receipt.quantityReceived <= 0) continue;
    const item = po.items.find((i) => i.id === receipt.purchaseOrderItemId);
    if (!item) continue;

    await prisma.purchaseOrderItem.update({
      where: { id: item.id },
      data: { quantityReceived: { increment: receipt.quantityReceived } },
    });

    await recordStockMovement({
      branchId: po.branchId,
      ingredientId: item.ingredientId,
      type: "RECEIPT",
      quantityDelta: receipt.quantityReceived,
      referenceType: "PurchaseOrder",
      referenceId: po.id,
      actorUserId,
    });
  }

  const refreshedItems = await prisma.purchaseOrderItem.findMany({ where: { purchaseOrderId } });
  const allReceived = refreshedItems.every((i) => Number(i.quantityReceived) >= Number(i.quantityOrdered));
  const anyReceived = refreshedItems.some((i) => Number(i.quantityReceived) > 0);
  const nextStatus = allReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : po.status;

  return prisma.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: { status: nextStatus },
    include: { items: { include: { ingredient: true } }, supplier: true, branch: true },
  });
}

export async function cancelPurchaseOrder(id: string) {
  const po = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id } });
  if (po.status === "RECEIVED" || po.status === "PARTIALLY_RECEIVED") {
    throw new InvalidPurchaseOrderStateError(po.status);
  }
  return prisma.purchaseOrder.update({ where: { id }, data: { status: "CANCELLED" } });
}
