import { z } from "zod";

export const createPromotionSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[A-Z0-9_-]+$/, "Code must be uppercase letters, numbers, hyphens, and underscores only"),
  name: z.string().min(1),
  description: z.string().optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discountValue: z.number().positive(),
  minSubtotal: z.number().nonnegative().optional(),
  maxDiscountAmount: z.number().positive().optional(),
  branchId: z.string().uuid().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  usageLimit: z.number().int().positive().optional(),
  usageLimitPerCustomer: z.number().int().positive().default(1),
});

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;

export const updatePromotionSchema = createPromotionSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;
