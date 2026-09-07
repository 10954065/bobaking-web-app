"use server";

import { createDeliveryZoneAction, deactivateDeliveryZoneAction } from "@/modules/delivery/actions/zone.actions";

export async function createZoneFormAction(branchId: string, formData: FormData) {
  const estimatedMinutesRaw = formData.get("estimatedMinutes");
  await createDeliveryZoneAction({
    branchId,
    name: String(formData.get("name") ?? ""),
    areaMatch: String(formData.get("areaMatch") ?? ""),
    fee: Number(formData.get("fee") ?? 0),
    estimatedMinutes: estimatedMinutesRaw ? Number(estimatedMinutesRaw) : undefined,
  });
}

export async function deactivateZoneFormAction(zoneId: string, branchId: string) {
  await deactivateDeliveryZoneAction(zoneId, branchId);
}
