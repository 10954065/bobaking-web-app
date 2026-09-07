import { z } from "zod";

export const createRiderSchema = z.object({
  branchId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  vehicleType: z.enum(["MOTORBIKE", "BICYCLE", "CAR", "ON_FOOT"]).default("MOTORBIKE"),
  plateNumber: z.string().optional(),
});

export type CreateRiderInput = z.infer<typeof createRiderSchema>;

export const locationPingSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type LocationPingInput = z.infer<typeof locationPingSchema>;
