"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/db/client";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requireAnyPermission } from "@/modules/auth/services/authorization.service";
import { updateLoyaltyConfig, adjustLoyaltyPoints, evaluatePointsRedemption } from "@/modules/loyalty/services/loyalty.service";
import { LoyaltyError } from "@/modules/loyalty/services/loyalty.service";
import type { UpdateLoyaltyConfigInput, AdjustLoyaltyPointsInput } from "@/modules/loyalty/schemas/loyalty.schema";
import { withSafeErrors } from "@/lib/errors";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export const updateLoyaltyConfigAction = withSafeErrors(async (input: UpdateLoyaltyConfigInput) => {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "loyalty", "update");
  const config = await updateLoyaltyConfig(input);
  revalidatePath("/admin/marketing/loyalty");
  return {
    pointsPerCurrency: Number(config.pointsPerCurrency),
    redemptionValue: Number(config.redemptionValue),
    minPointsToRedeem: config.minPointsToRedeem,
    isActive: config.isActive,
  };
}, "Couldn't update loyalty settings right now — please try again.");

export const adjustLoyaltyPointsAction = withSafeErrors(async (customerId: string, input: AdjustLoyaltyPointsInput) => {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "loyalty", "update");
  const { account } = await adjustLoyaltyPoints(customerId, input, userId);
  revalidatePath(`/admin/customers/${customerId}`);
  return { pointsBalance: account.pointsBalance };
}, "Couldn't adjust points right now — please try again.");

export interface PointsPreview {
  valid: boolean;
  message: string;
  discountAmount: number;
}

/** POS-facing "check this redemption before finalizing" — re-validated for real again inside checkoutAction/checkout.service.ts. */
export const previewPointsRedemptionAction = withSafeErrors(async (customerId: string, points: number): Promise<PointsPreview> => {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "customers", "read");

  try {
    const evaluation = await evaluatePointsRedemption(prisma, { customerId, points });
    return { valid: true, message: `${points} points = GHS ${evaluation.discountAmount.toFixed(2)} off`, discountAmount: evaluation.discountAmount };
  } catch (error) {
    if (error instanceof LoyaltyError) {
      return { valid: false, message: error.message, discountAmount: 0 };
    }
    throw error;
  }
}, "Couldn't check that redemption right now — please try again.");
