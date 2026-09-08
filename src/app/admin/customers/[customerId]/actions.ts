"use server";

import { adjustLoyaltyPointsAction } from "@/modules/loyalty/actions/loyalty.actions";

export async function adjustPointsFormAction(customerId: string, formData: FormData) {
  await adjustLoyaltyPointsAction(customerId, {
    points: Number(formData.get("points") ?? 0),
    reason: String(formData.get("reason") ?? ""),
  });
}
