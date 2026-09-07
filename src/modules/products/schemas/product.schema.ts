import { z } from "zod";

export const createProductSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().optional(),
  basePrice: z.number().positive("Price must be greater than zero"),
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().int().default(0),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const branchOverrideSchema = z.object({
  price: z.number().positive().nullable().optional(),
  isAvailable: z.boolean().optional(),
});

export type BranchOverrideInput = z.infer<typeof branchOverrideSchema>;
