"use server";

import { createRiderAction } from "@/modules/delivery/actions/rider-admin.actions";

const VEHICLE_TYPES = ["MOTORBIKE", "BICYCLE", "CAR", "ON_FOOT"] as const;

export async function createRiderFormAction(branchId: string, formData: FormData) {
  const vehicleTypeRaw = String(formData.get("vehicleType") ?? "MOTORBIKE");
  const vehicleType = (VEHICLE_TYPES as readonly string[]).includes(vehicleTypeRaw)
    ? (vehicleTypeRaw as (typeof VEHICLE_TYPES)[number])
    : "MOTORBIKE";

  await createRiderAction({
    branchId,
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? "") || undefined,
    phone: String(formData.get("phone") ?? "") || undefined,
    password: String(formData.get("password") ?? ""),
    vehicleType,
    plateNumber: String(formData.get("plateNumber") ?? "") || undefined,
  });
}
