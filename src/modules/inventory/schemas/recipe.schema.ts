import { z } from "zod";

export const recipeItemsSchema = z.array(
  z.object({
    ingredientId: z.string().uuid(),
    quantityPerUnit: z.number().positive(),
  })
);

export type RecipeItemsInput = z.infer<typeof recipeItemsSchema>;
