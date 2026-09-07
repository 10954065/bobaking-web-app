import { randomUUID } from "crypto";
import type {
  CreatePaymentIntentParams,
  PaymentIntentResult,
  PaymentProvider,
  RefundResult,
} from "@/modules/payments/providers/payment-provider.interface";

/**
 * Cash has no external gateway to call — "verification" is a staff action
 * (confirmCashPayment in payment.service.ts) taken when the money is
 * physically handed over at the counter, not something this provider can
 * check on its own. refund() succeeds immediately because the actual
 * hand-back of cash happens outside the system; this just records it.
 */
export class CashPaymentProvider implements PaymentProvider {
  readonly name = "cash";

  async createIntent(_params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    return { providerReference: `cash-${randomUUID()}`, status: "PENDING" };
  }

  async verify(): Promise<{ status: "PENDING" }> {
    return { status: "PENDING" };
  }

  async refund(providerReference: string): Promise<RefundResult> {
    return { providerReference, status: "SUCCEEDED" };
  }
}
