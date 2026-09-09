import { z } from "zod";
import { ghanaPhoneSchema } from "@/lib/phone";

export const requestOtpSchema = z.object({
  phone: ghanaPhoneSchema,
});
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: ghanaPhoneSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
