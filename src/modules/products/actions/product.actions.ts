"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requirePermission } from "@/modules/auth/services/authorization.service";
import { createProduct, updateProduct } from "@/modules/products/services/product.service";
import type { UpdateProductInput } from "@/modules/products/schemas/product.schema";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createProductAction(input: {
  categoryId: string;
  name: string;
  description?: string;
  basePrice: number;
  imageUrl?: string;
}) {
  const userId = await requireUserId();
  await requirePermission(userId, "products", "create", null);
  const product = await createProduct({
    categoryId: input.categoryId,
    name: input.name,
    slug: `${slugify(input.name)}-${Date.now().toString(36)}`,
    description: input.description || undefined,
    basePrice: input.basePrice,
    imageUrl: input.imageUrl || undefined,
    sortOrder: 0,
  });
  revalidatePath("/admin/menu");
  return product;
}

export async function updateProductAction(id: string, input: UpdateProductInput) {
  const userId = await requireUserId();
  await requirePermission(userId, "products", "update", null);
  const product = await updateProduct(id, input);
  revalidatePath("/admin/menu");
  return product;
}

export async function toggleProductActiveAction(id: string, isActive: boolean) {
  const userId = await requireUserId();
  await requirePermission(userId, "products", "update", null);
  const product = await updateProduct(id, { isActive });
  revalidatePath("/admin/menu");
  return product;
}
