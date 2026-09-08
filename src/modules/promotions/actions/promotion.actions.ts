"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/db/client";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requireAnyPermission, requirePermission } from "@/modules/auth/services/authorization.service";
import {
  createPromotion,
  updatePromotion,
  deactivatePromotion,
  evaluatePromotionCode,
  PromotionError,
} from "@/modules/promotions/services/promotion.service";
import type { CreatePromotionInput, UpdatePromotionInput } from "@/modules/promotions/schemas/promotion.schema";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

interface PromotionSummary {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

function toPromotionSummary(promotion: { id: string; code: string; name: string; isActive: boolean }): PromotionSummary {
  return { id: promotion.id, code: promotion.code, name: promotion.name, isActive: promotion.isActive };
}

/**
 * Promotions have no branch of their own when branchId is null (global) —
 * same "any grant is sufficient" reasoning as the product catalog — so
 * management actions use requireAnyPermission. Redeeming a code at checkout
 * is gated by orders.create instead (see checkoutAction), since applying a
 * code is just a normal part of ringing up an order.
 */
export async function createPromotionAction(input: CreatePromotionInput): Promise<PromotionSummary> {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "promotions", "create");
  const promotion = await createPromotion(input);
  revalidatePath("/admin/marketing/promotions");
  return toPromotionSummary(promotion);
}

export async function updatePromotionAction(id: string, input: UpdatePromotionInput): Promise<PromotionSummary> {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "promotions", "update");
  const promotion = await updatePromotion(id, input);
  revalidatePath("/admin/marketing/promotions");
  return toPromotionSummary(promotion);
}

export async function deactivatePromotionAction(id: string): Promise<PromotionSummary> {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "promotions", "update");
  const promotion = await deactivatePromotion(id);
  revalidatePath("/admin/marketing/promotions");
  return toPromotionSummary(promotion);
}

export interface PromoPreview {
  valid: boolean;
  message: string;
  discountAmount: number;
}

/** POS-facing "check this code before finalizing" — re-validated for real (no discount trusted) again inside checkoutAction/checkout.service.ts. */
export async function previewPromotionCodeAction(params: {
  code: string;
  branchId: string;
  customerId: string;
  subtotal: number;
}): Promise<PromoPreview> {
  const userId = await requireUserId();
  await requirePermission(userId, "orders", "create", params.branchId);

  try {
    const evaluation = await evaluatePromotionCode(prisma, params);
    return {
      valid: true,
      message: `${evaluation.promotionName} applied: GHS ${evaluation.discountAmount.toFixed(2)} off`,
      discountAmount: evaluation.discountAmount,
    };
  } catch (error) {
    if (error instanceof PromotionError) {
      return { valid: false, message: error.message, discountAmount: 0 };
    }
    throw error;
  }
}
