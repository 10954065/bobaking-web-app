"use server";

import { updateLoyaltyConfigAction } from "@/modules/loyalty/actions/loyalty.actions";

export async function updateLoyaltyConfigFormAction(formData: FormData) {
  await updateLoyaltyConfigAction({
    pointsPerCurrency: Number(formData.get("pointsPerCurrency") ?? 0),
    redemptionValue: Number(formData.get("redemptionValue") ?? 0),
    minPointsToRedeem: Number(formData.get("minPointsToRedeem") ?? 1),
    isActive: formData.get("isActive") === "on",
  });
}
