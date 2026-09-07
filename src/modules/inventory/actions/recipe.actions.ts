"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requireAnyPermission } from "@/modules/auth/services/authorization.service";
import { setRecipeForProduct } from "@/modules/inventory/services/recipe.service";
import type { RecipeItemsInput } from "@/modules/inventory/schemas/recipe.schema";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

/**
 * Product is a global catalog entity — recipes have no branch of their own.
 * Called directly from the RecipeEditor client component, so the return
 * value must be plain-serializable: Prisma's Decimal/nested-relation shape
 * (as returned by setRecipeForProduct) is not — see recordStockMovement's
 * client-facing counterparts (toPosCart, toKdsOrder) for the same rule.
 */
export async function setRecipeAction(productId: string, items: RecipeItemsInput) {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "recipes", "update");
  const recipe = await setRecipeForProduct(productId, items);
  revalidatePath(`/admin/recipes/${productId}`);
  return recipe.map((item) => ({ ingredientId: item.ingredientId, quantityPerUnit: Number(item.quantityPerUnit) }));
}
