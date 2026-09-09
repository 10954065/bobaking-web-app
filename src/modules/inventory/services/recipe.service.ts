import { prisma, DEFAULT_TRANSACTION_OPTIONS } from "@/db/client";
import { recordStockMovement } from "@/modules/inventory/services/stock.service";
import { recipeItemsSchema, type RecipeItemsInput } from "@/modules/inventory/schemas/recipe.schema";

export async function getRecipeForProduct(productId: string) {
  return prisma.recipeItem.findMany({
    where: { productId },
    include: { ingredient: true },
    orderBy: { ingredient: { name: "asc" } },
  });
}

/** Replaces the full recipe for a product transactionally — simplest correct model for "what this product needs right now." */
export async function setRecipeForProduct(productId: string, items: RecipeItemsInput) {
  const data = recipeItemsSchema.parse(items);
  return prisma.$transaction(async (tx) => {
    await tx.recipeItem.deleteMany({ where: { productId } });
    if (data.length > 0) {
      await tx.recipeItem.createMany({
        data: data.map((item) => ({
          productId,
          ingredientId: item.ingredientId,
          quantityPerUnit: item.quantityPerUnit,
        })),
      });
    }
    return tx.recipeItem.findMany({ where: { productId }, include: { ingredient: true } });
  }, DEFAULT_TRANSACTION_OPTIONS);
}

/**
 * Deducts stock for every ingredient in a product's recipe when a kitchen
 * item starts being prepared (see kitchen-order.service.ts startOrderItem).
 * Products with no recipe rows are a no-op — recipes are opt-in, not
 * mandatory, so untracked menu items never block cooking.
 *
 * Insufficient stock is allowed to go negative rather than blocking the
 * kitchen: an inaccurate stock count must never stop food being made. A
 * negative balance instead surfaces as an obvious low-stock signal for
 * procurement (see stock.service.ts listBranchStockView).
 */
export async function deductStockForProduct(params: {
  branchId: string;
  productId: string;
  quantity: number;
  actorUserId: string | null;
  referenceType: string;
  referenceId: string;
}) {
  const recipeItems = await prisma.recipeItem.findMany({ where: { productId: params.productId } });
  if (recipeItems.length === 0) return [];

  const movements = [];
  for (const item of recipeItems) {
    movements.push(
      await recordStockMovement({
        branchId: params.branchId,
        ingredientId: item.ingredientId,
        type: "SALE_DEDUCTION",
        quantityDelta: -(Number(item.quantityPerUnit) * params.quantity),
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        actorUserId: params.actorUserId,
      })
    );
  }
  return movements;
}
