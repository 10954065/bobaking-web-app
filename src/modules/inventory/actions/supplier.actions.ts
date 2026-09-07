"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requireAnyPermission } from "@/modules/auth/services/authorization.service";
import { createSupplier, updateSupplier, deactivateSupplier } from "@/modules/inventory/services/supplier.service";
import type { CreateSupplierInput, UpdateSupplierInput } from "@/modules/inventory/schemas/supplier.schema";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

/** Supplier has no branchId of its own — suppliers can serve multiple branches. */
export async function createSupplierAction(input: CreateSupplierInput) {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "suppliers", "create");
  const supplier = await createSupplier(input);
  revalidatePath("/admin/inventory/suppliers");
  return supplier;
}

export async function updateSupplierAction(id: string, input: UpdateSupplierInput) {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "suppliers", "update");
  const supplier = await updateSupplier(id, input);
  revalidatePath("/admin/inventory/suppliers");
  return supplier;
}

export async function deactivateSupplierAction(id: string) {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "suppliers", "update");
  const supplier = await deactivateSupplier(id);
  revalidatePath("/admin/inventory/suppliers");
  return supplier;
}
