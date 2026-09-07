import { z } from "zod";

export const createDeliveryZoneSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(1),
  areaMatch: z.string().min(1),
  fee: z.number().nonnegative(),
  estimatedMinutes: z.number().int().positive().optional(),
});

export type CreateDeliveryZoneInput = z.infer<typeof createDeliveryZoneSchema>;

export const updateDeliveryZoneSchema = createDeliveryZoneSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateDeliveryZoneInput = z.infer<typeof updateDeliveryZoneSchema>;
