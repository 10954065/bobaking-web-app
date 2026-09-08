import { prisma } from "@/db/client";
import { Prisma } from "@prisma/client";
import { generateOrderNumber } from "@/modules/orders/services/order-number.service";
import { getOrderByIdempotencyKey, getOrderById, type OrderWithDetails } from "@/modules/orders/services/order.service";
import { recordAuditLog } from "@/modules/audit/services/audit.service";
import { evaluatePromotionCode } from "@/modules/promotions/services/promotion.service";
import { evaluatePointsRedemption, recordLoyaltyTransaction } from "@/modules/loyalty/services/loyalty.service";

export class EmptyCartError extends Error {
  constructor() {
    super("Cannot check out an empty cart.");
    this.name = "EmptyCartError";
  }
}

export class ProductUnavailableError extends Error {
  constructor(productName: string) {
    super(`${productName} is not available at this branch right now.`);
    this.name = "ProductUnavailableError";
  }
}

export class MissingDeliveryAddressError extends Error {
  constructor() {
    super("A delivery address is required for delivery orders.");
    this.name = "MissingDeliveryAddressError";
  }
}

export class InvalidDeliveryAddressError extends Error {
  constructor() {
    super("That delivery address does not belong to this customer.");
    this.name = "InvalidDeliveryAddressError";
  }
}

export interface CheckoutInput {
  cartId: string;
  idempotencyKey: string;
  deliveryAddressId?: string;
  scheduledFor?: Date;
  placedByUserId?: string;
  notes?: string;
  /** A coupon code, case-insensitive — re-validated fresh here, never trusted from a client-supplied discount amount. */
  promotionCode?: string;
  /** Loyalty points to spend on this order — re-validated against the customer's real balance here, not trusted from a client-supplied discount amount. */
  redeemPoints?: number;
}

/**
 * Converts a cart into an order. Idempotent: replaying the same
 * idempotencyKey (e.g. a retried checkout request after a dropped response)
 * returns the already-created order instead of creating a duplicate.
 *
 * Price resolution happens inside the transaction against `tx`, not through
 * product.service's branch-resolution helper (which uses the module-level
 * prisma client) — reusing it here would run outside the transaction and
 * could read state that changes before this transaction commits.
 */
export async function checkout(input: CheckoutInput): Promise<OrderWithDetails> {
  const existing = await getOrderByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    return (await getOrderById(existing.id))!;
  }

  const orderId = await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUniqueOrThrow({
      where: { id: input.cartId },
      include: {
        items: {
          include: { product: true, modifiers: { include: { modifierOption: true } } },
        },
        branch: true,
      },
    });

    if (cart.status !== "ACTIVE") {
      throw new Error(`Cart is ${cart.status.toLowerCase()}, not active.`);
    }
    if (cart.items.length === 0) {
      throw new EmptyCartError();
    }

    let subtotal = new Prisma.Decimal(0);
    const itemsToCreate: {
      productId: string;
      productName: string;
      unitPrice: Prisma.Decimal;
      quantity: number;
      lineSubtotal: Prisma.Decimal;
      notes: string | null;
      modifiers: { modifierOptionId: string; optionName: string; priceDelta: Prisma.Decimal }[];
    }[] = [];

    for (const item of cart.items) {
      const override = await tx.productBranchOverride.findUnique({
        where: { productId_branchId: { productId: item.productId, branchId: cart.branchId } },
      });
      const isAvailable = item.product.isActive && (override?.isAvailable ?? true);
      if (!isAvailable) {
        throw new ProductUnavailableError(item.product.name);
      }

      const unitPrice = override?.price ?? item.product.basePrice;
      const modifiersTotal = item.modifiers.reduce(
        (sum, m) => sum.plus(m.modifierOption.priceDelta),
        new Prisma.Decimal(0)
      );
      const lineSubtotal = unitPrice.plus(modifiersTotal).times(item.quantity);
      subtotal = subtotal.plus(lineSubtotal);

      itemsToCreate.push({
        productId: item.productId,
        productName: item.product.name,
        unitPrice,
        quantity: item.quantity,
        lineSubtotal,
        notes: item.notes,
        modifiers: item.modifiers.map((m) => ({
          modifierOptionId: m.modifierOptionId,
          optionName: m.modifierOption.name,
          priceDelta: m.modifierOption.priceDelta,
        })),
      });
    }

    // Promotion codes and loyalty-point redemption are independent discount
    // sources that can both apply to the same order — combined and capped at
    // subtotal so a heavily-discounted order can never go negative before tax
    // and delivery fee are added back in.
    let promotionId: string | null = null;
    let promotionDiscount = 0;
    if (input.promotionCode) {
      const evaluation = await evaluatePromotionCode(tx, {
        code: input.promotionCode,
        branchId: cart.branchId,
        customerId: cart.customerId,
        subtotal: Number(subtotal),
      });
      promotionId = evaluation.promotionId;
      promotionDiscount = evaluation.discountAmount;
    }

    const pointsRedeemed = input.redeemPoints ?? 0;
    let pointsDiscount = 0;
    if (pointsRedeemed > 0) {
      const evaluation = await evaluatePointsRedemption(tx, { customerId: cart.customerId, points: pointsRedeemed });
      pointsDiscount = evaluation.discountAmount;
    }

    const discountTotal = Prisma.Decimal.min(
      new Prisma.Decimal(promotionDiscount).plus(pointsDiscount),
      subtotal
    );

    let deliveryFee = new Prisma.Decimal(0);
    let deliveryZoneId: string | null = null;
    if (cart.type === "DELIVERY") {
      if (!input.deliveryAddressId) {
        throw new MissingDeliveryAddressError();
      }
      const address = await tx.customerAddress.findUniqueOrThrow({ where: { id: input.deliveryAddressId } });
      if (address.customerId !== cart.customerId) {
        throw new InvalidDeliveryAddressError();
      }

      const zone = address.area
        ? await tx.deliveryZone.findFirst({
            where: { branchId: cart.branchId, isActive: true, areaMatch: { equals: address.area, mode: "insensitive" } },
          })
        : null;
      deliveryFee = zone?.fee ?? cart.branch.defaultDeliveryFee;
      deliveryZoneId = zone?.id ?? null;
    }

    const taxTotal = subtotal.times(cart.branch.taxRate);
    const total = subtotal.plus(taxTotal).plus(deliveryFee).minus(discountTotal);

    const orderNumber = await generateOrderNumber();

    const order = await tx.order.create({
      data: {
        orderNumber,
        branchId: cart.branchId,
        customerId: cart.customerId,
        type: cart.type,
        status: "DRAFT",
        subtotal,
        discountTotal,
        taxTotal,
        deliveryFee,
        deliveryZoneId,
        promotionId,
        pointsRedeemed,
        total,
        notes: input.notes ?? cart.notes,
        deliveryAddressId: input.deliveryAddressId,
        scheduledFor: input.scheduledFor,
        placedByUserId: input.placedByUserId,
        idempotencyKey: input.idempotencyKey,
        items: {
          create: itemsToCreate.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            lineSubtotal: item.lineSubtotal,
            notes: item.notes,
            modifiers: { create: item.modifiers },
          })),
        },
      },
    });

    await tx.orderStatusHistory.create({
      data: { orderId: order.id, fromStatus: null, toStatus: "DRAFT", changedByUserId: input.placedByUserId ?? null },
    });

    // Points are debited immediately at checkout (order creation), not
    // deferred to payment success like earning is — the order's discountTotal
    // is already fixed at this point and must match what was actually taken
    // from the balance. Known gap: a later-cancelled/failed order does not
    // currently refund these points, same as this app's other unresolved
    // cancel-side-effects (recipe stock isn't refunded on cancel either).
    if (pointsRedeemed > 0) {
      await recordLoyaltyTransaction(tx, {
        customerId: cart.customerId,
        orderId: order.id,
        type: "REDEEMED",
        points: -pointsRedeemed,
        reason: `Redeemed at checkout for order ${order.orderNumber}`,
      });
    }

    await tx.cart.update({ where: { id: cart.id }, data: { status: "CONVERTED" } });

    return order.id;
  });

  await recordAuditLog({
    actorUserId: input.placedByUserId ?? null,
    action: "order.created",
    resourceType: "Order",
    resourceId: orderId,
  });

  return (await getOrderById(orderId))!;
}
