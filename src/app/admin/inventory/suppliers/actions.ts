"use server";

import { createSupplierAction, deactivateSupplierAction } from "@/modules/inventory/actions/supplier.actions";

export async function createSupplierFormAction(formData: FormData) {
  await createSupplierAction({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? "") || undefined,
    email: String(formData.get("email") ?? ""),
    address: String(formData.get("address") ?? "") || undefined,
  });
}

export async function toggleSupplierFormAction(supplierId: string) {
  await deactivateSupplierAction(supplierId);
}
