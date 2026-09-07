import { z } from "zod";

export const createCustomerSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().min(1).optional(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
  })
  .refine((data) => data.email || data.phone, {
    message: "A customer requires at least an email or a phone number",
    path: ["email"],
  });

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const createCustomerAddressSchema = z.object({
  label: z.string().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  area: z.string().optional(),
  city: z.string().optional(),
  landmark: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().default(false),
});

export type CreateCustomerAddressInput = z.infer<typeof createCustomerAddressSchema>;
