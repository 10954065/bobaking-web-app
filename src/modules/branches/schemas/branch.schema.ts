import { z } from "zod";

export const createBranchSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  cityId: z.string().uuid(),
  address: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timezone: z.string().default("Africa/Accra"),
  currency: z.string().default("GHS"),
  openingHours: z.record(z.string(), z.object({ open: z.string(), close: z.string() })).optional(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const updateBranchSchema = createBranchSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE", "COMING_SOON", "TEMPORARILY_CLOSED"]).optional(),
});

export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
