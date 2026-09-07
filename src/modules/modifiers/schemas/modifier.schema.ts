import { z } from "zod";

export const createModifierGroupSchema = z.object({
  name: z.string().min(1),
  selectionType: z.enum(["SINGLE", "MULTIPLE"]).default("SINGLE"),
  isRequired: z.boolean().default(false),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).optional(),
});

export type CreateModifierGroupInput = z.infer<typeof createModifierGroupSchema>;

export const createModifierOptionSchema = z.object({
  modifierGroupId: z.string().uuid(),
  name: z.string().min(1),
  priceDelta: z.number().default(0),
  sortOrder: z.number().int().default(0),
});

export type CreateModifierOptionInput = z.infer<typeof createModifierOptionSchema>;
