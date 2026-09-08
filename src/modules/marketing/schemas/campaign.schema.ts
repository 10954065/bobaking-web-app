import { z } from "zod";

export const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  audience: z.enum(["ALL_CUSTOMERS", "NEW_CUSTOMERS", "RETURNING_CUSTOMERS"]).default("ALL_CUSTOMERS"),
  promotionId: z.string().uuid().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignStatusSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "ENDED"]),
});

export type UpdateCampaignStatusInput = z.infer<typeof updateCampaignStatusSchema>;
