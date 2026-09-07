"use server";

import { createIngredientAction } from "@/modules/inventory/actions/ingredient.actions";
import { adjustStockAction } from "@/modules/inventory/actions/stock.actions";

/**
 * Thin FormData -> typed-action adapters so the page can bind plain HTML
 * forms directly to server actions (no client JS needed for these mutations).
 */
export async function createIngredientFormAction(formData: FormData) {
  await createIngredientAction({
    name: String(formData.get("name") ?? ""),
    sku: String(formData.get("sku") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    reorderLevel: Number(formData.get("reorderLevel") ?? 0),
  });
}

export async function adjustStockFormAction(branchId: string, ingredientId: string, formData: FormData) {
  await adjustStockAction(branchId, {
    ingredientId,
    quantityDelta: Number(formData.get("quantityDelta") ?? 0),
    reason: String(formData.get("reason") ?? ""),
  });
}
