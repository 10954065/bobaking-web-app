import { z } from "zod";

export const guestDetailsSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional(),
});
export type GuestDetailsInput = z.infer<typeof guestDetailsSchema>;

export const guestDeliveryAddressSchema = z.object({
  addressLine1: z.string().min(1),
  area: z.string().optional(),
  landmark: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
export type GuestDeliveryAddressInput = z.infer<typeof guestDeliveryAddressSchema>;

export const storefrontCartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
  notes: z.string().max(500).optional(),
  modifierOptionIds: z.array(z.string().uuid()).default([]),
});
export type StorefrontCartItemInput = z.infer<typeof storefrontCartItemSchema>;

export const placeStorefrontOrderSchema = z
  .object({
    branchId: z.string().uuid(),
    type: z.enum(["DELIVERY", "PICKUP"]),
    guest: guestDetailsSchema,
    deliveryAddress: guestDeliveryAddressSchema.optional(),
    items: z.array(storefrontCartItemSchema).min(1, "Your cart is empty."),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.type !== "DELIVERY" || !!data.deliveryAddress, {
    message: "A delivery address is required for delivery orders.",
    path: ["deliveryAddress"],
  });
export type PlaceStorefrontOrderInput = z.infer<typeof placeStorefrontOrderSchema>;
