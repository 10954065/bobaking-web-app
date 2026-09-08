import { z } from "zod";

export const updateLoyaltyConfigSchema = z.object({
  pointsPerCurrency: z.number().positive(),
  redemptionValue: z.number().positive(),
  minPointsToRedeem: z.number().int().positive(),
  isActive: z.boolean(),
});

export type UpdateLoyaltyConfigInput = z.infer<typeof updateLoyaltyConfigSchema>;

export const adjustLoyaltyPointsSchema = z.object({
  points: z.number().int().refine((n) => n !== 0, "Adjustment cannot be zero"),
  reason: z.string().min(1, "A reason is required for manual point adjustments"),
});

export type AdjustLoyaltyPointsInput = z.infer<typeof adjustLoyaltyPointsSchema>;
