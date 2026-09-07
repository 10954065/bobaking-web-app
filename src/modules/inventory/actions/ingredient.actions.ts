"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requireAnyPermission } from "@/modules/auth/services/authorization.service";
import { createIngredient, updateIngredient, deactivateIngredient } from "@/modules/inventory/services/ingredient.service";
import type { CreateIngredientInput, UpdateIngredientInput } from "@/modules/inventory/schemas/ingredient.schema";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

interface IngredientSummary {
  id: string;
  name: string;
  sku: string;
  unit: string;
  reorderLevel: number;
  isActive: boolean;
}

// Prisma's Ingredient.reorderLevel is a Decimal — a class instance, not a
// plain object — so it can't cross a server-action boundary a client
// component might call directly. Always trim to a plain shape here.
function toIngredientSummary(ingredient: { id: string; name: string; sku: string; unit: string; reorderLevel: unknown; isActive: boolean }): IngredientSummary {
  return {
    id: ingredient.id,
    name: ingredient.name,
    sku: ingredient.sku,
    unit: ingredient.unit,
    reorderLevel: Number(ingredient.reorderLevel),
    isActive: ingredient.isActive,
  };
}

/** Ingredient is a global catalog (no branchId of its own) — same coarse-grant shape as the product catalog, gated by inventory.adjust. */
export async function createIngredientAction(input: CreateIngredientInput): Promise<IngredientSummary> {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "inventory", "adjust");
  const ingredient = await createIngredient(input);
  revalidatePath("/admin/inventory");
  return toIngredientSummary(ingredient);
}

export async function updateIngredientAction(id: string, input: UpdateIngredientInput): Promise<IngredientSummary> {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "inventory", "adjust");
  const ingredient = await updateIngredient(id, input);
  revalidatePath("/admin/inventory");
  return toIngredientSummary(ingredient);
}

export async function deactivateIngredientAction(id: string): Promise<IngredientSummary> {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "inventory", "adjust");
  const ingredient = await deactivateIngredient(id);
  revalidatePath("/admin/inventory");
  return toIngredientSummary(ingredient);
}
