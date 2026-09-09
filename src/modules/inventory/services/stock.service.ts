import { prisma, DEFAULT_TRANSACTION_OPTIONS } from "@/db/client";
import type { StockMovementType } from "@prisma/client";
import { adjustStockSchema, type AdjustStockInput } from "@/modules/inventory/schemas/stock.schema";

export interface RecordStockMovementInput {
  branchId: string;
  ingredientId: string;
  type: StockMovementType;
  /** Signed: positive increases stock, negative decreases it. */
  quantityDelta: number;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  actorUserId?: string | null;
}

/**
 * The single write path for stock changes — every increase/decrease of
 * BranchIngredientStock.quantityOnHand goes through here so a StockMovement
 * row is always recorded alongside it (append-only ledger, mirroring
 * AuditLog). Never mutate BranchIngredientStock directly anywhere else.
 */
export async function recordStockMovement(input: RecordStockMovementInput) {
  return prisma.$transaction(async (tx) => {
    const stock = await tx.branchIngredientStock.upsert({
      where: { branchId_ingredientId: { branchId: input.branchId, ingredientId: input.ingredientId } },
      create: { branchId: input.branchId, ingredientId: input.ingredientId, quantityOnHand: input.quantityDelta },
      update: { quantityOnHand: { increment: input.quantityDelta } },
    });

    const movement = await tx.stockMovement.create({
      data: {
        branchId: input.branchId,
        ingredientId: input.ingredientId,
        type: input.type,
        quantityDelta: input.quantityDelta,
        quantityAfter: stock.quantityOnHand,
        reason: input.reason ?? null,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        actorUserId: input.actorUserId ?? null,
      },
    });

    return { stock, movement };
  }, DEFAULT_TRANSACTION_OPTIONS);
}

export async function adjustStock(params: {
  branchId: string;
  actorUserId: string;
  input: AdjustStockInput;
}) {
  const data = adjustStockSchema.parse(params.input);
  return recordStockMovement({
    branchId: params.branchId,
    ingredientId: data.ingredientId,
    type: "ADJUSTMENT",
    quantityDelta: data.quantityDelta,
    reason: data.reason,
    actorUserId: params.actorUserId,
  });
}

export interface BranchStockRow {
  ingredientId: string;
  name: string;
  sku: string;
  unit: string;
  quantityOnHand: number;
  reorderLevel: number;
  isLowStock: boolean;
}

/** Every active ingredient resolved against this branch's stock — ingredients with no movement yet show as zero on hand rather than being omitted. */
export async function listBranchStockView(branchId: string): Promise<BranchStockRow[]> {
  const ingredients = await prisma.ingredient.findMany({
    where: { isActive: true },
    include: { branchStocks: { where: { branchId } } },
    orderBy: { name: "asc" },
  });

  return ingredients.map((ingredient) => {
    const stock = ingredient.branchStocks[0];
    const reorderLevel = Number(stock?.reorderLevel ?? ingredient.reorderLevel);
    const quantityOnHand = Number(stock?.quantityOnHand ?? 0);
    return {
      ingredientId: ingredient.id,
      name: ingredient.name,
      sku: ingredient.sku,
      unit: ingredient.unit,
      quantityOnHand,
      reorderLevel,
      isLowStock: quantityOnHand <= reorderLevel,
    };
  });
}

export async function listRecentStockMovements(branchId: string, limit = 50) {
  return prisma.stockMovement.findMany({
    where: { branchId },
    include: { ingredient: true, actorUser: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
