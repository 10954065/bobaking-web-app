import { randomUUID } from "crypto";
import type {
  CreatePaymentIntentParams,
  PaymentIntentResult,
  PaymentProvider,
  RefundResult,
} from "@/modules/payments/providers/payment-provider.interface";

/**
 * Development stand-in for a real Ghanaian Mobile Money gateway (MTN MoMo,
 * Paystack, Flutterwave, ...) — no merchant account is provisioned for this
 * project yet. It implements the same PaymentProvider interface a real
 * gateway would, so swapping this out later touches only the provider
 * registry in payment.service.ts, never the order/checkout code that calls
 * it. Real completion is simulated via processWebhookEvent() in
 * payment.service.ts, exactly like a real gateway's webhook would drive it —
 * there is no polling "verify" backend to call in dev, so verify() always
 * reports PENDING and callers are expected to advance state through the
 * webhook path instead.
 */
export class MobileMoneyDevProvider implements PaymentProvider {
  readonly name = "mobile-money-dev";

  async createIntent(_params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    return { providerReference: `momo-dev-${randomUUID()}`, status: "PENDING" };
  }

  async verify(): Promise<{ status: "PENDING" }> {
    return { status: "PENDING" };
  }

  async refund(providerReference: string): Promise<RefundResult> {
    return { providerReference, status: "SUCCEEDED" };
  }
}
