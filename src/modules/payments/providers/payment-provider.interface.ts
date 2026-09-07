import type { Prisma } from "@prisma/client";

export type PaymentProviderStatus = "PENDING" | "SUCCEEDED" | "FAILED";

export interface CreatePaymentIntentParams {
  orderId: string;
  amount: Prisma.Decimal;
  currency: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentIntentResult {
  providerReference: string;
  status: PaymentProviderStatus;
}

export interface RefundResult {
  providerReference: string;
  status: "SUCCEEDED" | "FAILED";
}

/**
 * Every payment method (cash, mobile money, card, ...) implements this same
 * interface so the order/payment domain never couples to a specific
 * gateway's SDK. Real gateways (Paystack, Flutterwave, Stripe, ...) slot in
 * later as additional implementations — see payment.service.ts's provider
 * registry for where a new one gets wired in.
 */
export interface PaymentProvider {
  readonly name: string;
  createIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult>;
  verify(providerReference: string): Promise<{ status: PaymentProviderStatus }>;
  refund(providerReference: string, amount: Prisma.Decimal): Promise<RefundResult>;
}
