import { z } from "zod";

export const adjustStockSchema = z.object({
  ingredientId: z.string().uuid(),
  quantityDelta: z.number().refine((n) => n !== 0, "Adjustment cannot be zero"),
  reason: z.string().min(1, "A reason is required for manual stock adjustments"),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
