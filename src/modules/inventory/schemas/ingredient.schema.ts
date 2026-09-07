import { z } from "zod";

export const createIngredientSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  unit: z.string().min(1),
  reorderLevel: z.number().min(0).default(0),
});

export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;

export const updateIngredientSchema = createIngredientSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;
