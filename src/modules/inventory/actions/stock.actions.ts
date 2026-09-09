"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requirePermission } from "@/modules/auth/services/authorization.service";
import { adjustStock } from "@/modules/inventory/services/stock.service";
import type { AdjustStockInput } from "@/modules/inventory/schemas/stock.schema";
import { withSafeErrors } from "@/lib/errors";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

/** BranchIngredientStock is branch-owned — always the strict, branch-matching check, never requireAnyPermission. */
export const adjustStockAction = withSafeErrors(async (
  branchId: string,
  input: AdjustStockInput
): Promise<{ quantityOnHand: number }> => {
  const userId = await requireUserId();
  await requirePermission(userId, "inventory", "adjust", branchId);
  const { stock } = await adjustStock({ branchId, actorUserId: userId, input });
  revalidatePath("/admin/inventory");
  // stock.quantityOnHand is a Prisma Decimal — trim to a number, the only
  // form that can safely cross the server-action boundary to a client caller.
  return { quantityOnHand: Number(stock.quantityOnHand) };
}, "Couldn't adjust stock right now — please try again.");
