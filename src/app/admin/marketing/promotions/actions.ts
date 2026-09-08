"use server";

import { createPromotionAction, deactivatePromotionAction } from "@/modules/promotions/actions/promotion.actions";

function optionalNumber(value: FormDataEntryValue | null): number | undefined {
  if (!value || value === "") return undefined;
  return Number(value);
}

export async function createPromotionFormAction(formData: FormData) {
  const discountType = String(formData.get("discountType") ?? "PERCENTAGE");
  const branchId = String(formData.get("branchId") ?? "");

  await createPromotionAction({
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    discountType: discountType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE",
    discountValue: Number(formData.get("discountValue") ?? 0),
    minSubtotal: optionalNumber(formData.get("minSubtotal")),
    maxDiscountAmount: optionalNumber(formData.get("maxDiscountAmount")),
    branchId: branchId || undefined,
    usageLimit: optionalNumber(formData.get("usageLimit")),
    usageLimitPerCustomer: optionalNumber(formData.get("usageLimitPerCustomer")) ?? 1,
  });
}

export async function deactivatePromotionFormAction(id: string) {
  await deactivatePromotionAction(id);
}
