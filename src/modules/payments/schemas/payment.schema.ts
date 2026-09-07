import { z } from "zod";

export const initiatePaymentSchema = z.object({
  orderId: z.string().uuid(),
  method: z.enum(["CASH", "MOBILE_MONEY", "CARD"]),
  idempotencyKey: z.string().min(1),
  initiatedByUserId: z.string().uuid().optional(),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

export const refundPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().optional(),
  initiatedByUserId: z.string().uuid().optional(),
});

export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;

export const webhookEventSchema = z.object({
  provider: z.string().min(1),
  externalId: z.string().optional(),
  eventType: z.string().min(1),
  providerReference: z.string().min(1),
  status: z.enum(["SUCCEEDED", "FAILED"]),
});

export type WebhookEventInput = z.infer<typeof webhookEventSchema>;
