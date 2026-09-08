"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requirePermission } from "@/modules/auth/services/authorization.service";
import { createCategory, updateCategory } from "@/modules/categories/services/category.service";
import type { CreateCategoryInput, UpdateCategoryInput } from "@/modules/categories/schemas/category.schema";

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

export async function createCategoryAction(input: { name: string; description?: string; sortOrder?: number }) {
  const userId = await requireUserId();
  await requirePermission(userId, "categories", "create", null);
  const data: CreateCategoryInput = {
    name: input.name,
    slug: slugify(input.name),
    description: input.description || undefined,
    sortOrder: input.sortOrder ?? 0,
  };
  const category = await createCategory(data);
  revalidatePath("/admin/menu");
  return category;
}

export async function updateCategoryAction(id: string, input: UpdateCategoryInput) {
  const userId = await requireUserId();
  await requirePermission(userId, "categories", "update", null);
  const category = await updateCategory(id, input);
  revalidatePath("/admin/menu");
  return category;
}

export async function toggleCategoryActiveAction(id: string, isActive: boolean) {
  const userId = await requireUserId();
  await requirePermission(userId, "categories", "update", null);
  const category = await updateCategory(id, { isActive });
  revalidatePath("/admin/menu");
  return category;
}
