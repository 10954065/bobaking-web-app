import { prisma } from "@/db/client";
import { transitionOrder } from "@/modules/orders/services/order.service";
import { canTransition } from "@/modules/orders/services/order-state-machine";
import { publishKitchenEvent } from "@/modules/kitchen/services/kitchen-events";
import { deductStockForProduct } from "@/modules/inventory/services/recipe.service";

/**
 * KDS-specific orchestration on top of the generic order state machine:
 * starting the first item moves the order SENT_TO_KITCHEN -> PREPARING, and
 * marking the last item ready moves it PREPARING -> READY. Neither auto-
 * transition happens if the order isn't in the expected state (e.g. it was
 * already cancelled) — canTransition simply makes the attempt a no-op.
 */

export async function startOrderItem(orderItemId: string, actorUserId: string) {
  const item = await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { kitchenStatus: "PREPARING", startedAt: new Date() },
    include: { order: true },
  });

  // Real ingredient consumption happens the moment the kitchen actually
  // starts making the item, not at checkout — see recipe.service.ts for why
  // this never blocks cooking even when stock would go negative.
  await deductStockForProduct({
    branchId: item.order.branchId,
    productId: item.productId,
    quantity: item.quantity,
    actorUserId,
    referenceType: "OrderItem",
    referenceId: item.id,
  });

  if (canTransition(item.order.status, "PREPARING")) {
    await transitionOrder({
      orderId: item.orderId,
      toStatus: "PREPARING",
      actorUserId,
      reason: "First item started",
    });
  } else {
    await publishKitchenEvent(item.order.branchId, {
      type: "order.item_updated",
      orderId: item.orderId,
      orderItemId: item.id,
    }).catch(() => {});
  }

  return item;
}

export async function markOrderItemReady(orderItemId: string, actorUserId: string) {
  const item = await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { kitchenStatus: "READY", readyAt: new Date() },
    include: { order: { include: { items: true } } },
  });

  const allItemsReady = item.order.items.every((i) => i.kitchenStatus === "READY");

  if (allItemsReady && canTransition(item.order.status, "READY")) {
    await transitionOrder({
      orderId: item.orderId,
      toStatus: "READY",
      actorUserId,
      reason: "All items ready",
    });
  } else {
    await publishKitchenEvent(item.order.branchId, {
      type: "order.item_updated",
      orderId: item.orderId,
      orderItemId: item.id,
    }).catch(() => {});
  }

  return item;
}

/** The kitchen's live queue: everything from SENT_TO_KITCHEN through READY, oldest first. */
export async function listKitchenQueueForBranch(branchId: string) {
  return prisma.order.findMany({
    where: { branchId, status: { in: ["SENT_TO_KITCHEN", "PREPARING", "READY"] } },
    include: { items: { include: { modifiers: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export interface KdsOrderItem {
  id: string;
  productName: string;
  quantity: number;
  notes: string | null;
  kitchenStatus: "PENDING" | "PREPARING" | "READY";
  stationSlug: string | null;
  modifiers: string[];
}

export interface KdsOrder {
  id: string;
  orderNumber: string;
  status: string;
  type: string;
  notes: string | null;
  createdAt: string;
}

export interface KdsOrderWithItems extends KdsOrder {
  items: KdsOrderItem[];
}

/**
 * Prisma's Decimal fields (and Date, technically — kept here as ISO strings
 * for simplicity) can't cross the server/client component boundary as-is;
 * this strips a fetched order down to the plain, serializable shape the KDS
 * UI actually needs. Kitchen staff have no reason to see prices at all.
 */
export function toKdsOrder(
  order: Awaited<ReturnType<typeof listKitchenQueueForBranch>>[number]
): KdsOrderWithItems {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    type: order.type,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      notes: item.notes,
      kitchenStatus: item.kitchenStatus,
      stationSlug: item.stationSlug,
      modifiers: item.modifiers.map((m) => m.optionName),
    })),
  };
}
