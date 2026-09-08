import { prisma } from "@/db/client";
import type { Prisma, OrderStatus } from "@prisma/client";
import {
  createPromotionSchema,
  updatePromotionSchema,
  type CreatePromotionInput,
  type UpdatePromotionInput,
} from "@/modules/promotions/schemas/promotion.schema";

export class PromotionError extends Error {}

export class InvalidPromotionCodeError extends PromotionError {
  constructor() {
    super("Invalid or expired promo code.");
    this.name = "InvalidPromotionCodeError";
  }
}

export class PromotionNotEligibleError extends PromotionError {
  constructor(message: string) {
    super(message);
    this.name = "PromotionNotEligibleError";
  }
}

/** Orders in these statuses never happened (or never will) from the customer's perspective — they don't count against a promotion's usage limits. */
const NON_COUNTING_STATUSES: OrderStatus[] = ["DRAFT", "CANCELLED", "REJECTED", "PAYMENT_FAILED"];

export interface PromotionEvaluation {
  promotionId: string;
  promotionName: string;
  discountAmount: number;
}

/**
 * Validates a code and computes its discount for a specific order context.
 * Takes an explicit Prisma client so it can run either standalone (POS
 * "preview this code" call) or inside checkout.service.ts's transaction
 * (`tx`) — the same reasoning checkout.service.ts already documents for why
 * it doesn't call other services' helpers bound to the outer `prisma` client.
 * Never trust a client-supplied discount amount: this is the only place a
 * discount is computed, and checkout.service.ts always calls it fresh.
 */
export async function evaluatePromotionCode(
  client: Prisma.TransactionClient | typeof prisma,
  params: { code: string; branchId: string; customerId: string; subtotal: number }
): Promise<PromotionEvaluation> {
  const promotion = await client.promotion.findUnique({ where: { code: params.code.trim().toUpperCase() } });
  if (!promotion || !promotion.isActive) {
    throw new InvalidPromotionCodeError();
  }

  const now = new Date();
  if (promotion.startsAt && now < promotion.startsAt) {
    throw new PromotionNotEligibleError("This promotion hasn't started yet.");
  }
  if (promotion.endsAt && now > promotion.endsAt) {
    throw new PromotionNotEligibleError("This promotion has expired.");
  }
  if (promotion.branchId && promotion.branchId !== params.branchId) {
    throw new PromotionNotEligibleError("This promotion isn't valid at this branch.");
  }
  if (promotion.minSubtotal && params.subtotal < Number(promotion.minSubtotal)) {
    throw new PromotionNotEligibleError(
      `Order must be at least GHS ${Number(promotion.minSubtotal).toFixed(2)} to use this code.`
    );
  }

  if (promotion.usageLimit != null) {
    const totalUses = await client.order.count({
      where: { promotionId: promotion.id, status: { notIn: NON_COUNTING_STATUSES } },
    });
    if (totalUses >= promotion.usageLimit) {
      throw new PromotionNotEligibleError("This promotion has reached its usage limit.");
    }
  }
  if (promotion.usageLimitPerCustomer != null) {
    const customerUses = await client.order.count({
      where: { promotionId: promotion.id, customerId: params.customerId, status: { notIn: NON_COUNTING_STATUSES } },
    });
    if (customerUses >= promotion.usageLimitPerCustomer) {
      throw new PromotionNotEligibleError("You've already used this promotion.");
    }
  }

  let discount =
    promotion.discountType === "PERCENTAGE"
      ? params.subtotal * (Number(promotion.discountValue) / 100)
      : Number(promotion.discountValue);

  if (promotion.maxDiscountAmount != null) {
    discount = Math.min(discount, Number(promotion.maxDiscountAmount));
  }
  discount = Math.min(discount, params.subtotal);
  discount = Math.round(discount * 100) / 100;

  return { promotionId: promotion.id, promotionName: promotion.name, discountAmount: discount };
}

export async function listPromotions(params: { includeInactive?: boolean } = {}) {
  return prisma.promotion.findMany({
    where: params.includeInactive ? {} : { isActive: true },
    include: { branch: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPromotion(input: CreatePromotionInput) {
  const data = createPromotionSchema.parse(input);
  return prisma.promotion.create({ data: { ...data, code: data.code.toUpperCase() } });
}

export async function updatePromotion(id: string, input: UpdatePromotionInput) {
  const data = updatePromotionSchema.parse(input);
  return prisma.promotion.update({
    where: { id },
    data: { ...data, code: data.code ? data.code.toUpperCase() : undefined },
  });
}

/** Promotions are never hard-deleted — orders reference them via Order.promotionId. Hiding one only flips isActive. */
export async function deactivatePromotion(id: string) {
  return prisma.promotion.update({ where: { id }, data: { isActive: false } });
}
