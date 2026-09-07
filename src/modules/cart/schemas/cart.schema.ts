import { z } from "zod";

export const createCartSchema = z.object({
  branchId: z.string().uuid(),
  customerId: z.string().uuid(),
  type: z.enum(["DELIVERY", "PICKUP", "DINE_IN"]).default("PICKUP"),
});

export type CreateCartInput = z.infer<typeof createCartSchema>;

export const addCartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50).default(1),
  notes: z.string().max(500).optional(),
  modifierOptionIds: z.array(z.string().uuid()).default([]),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(50),
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
