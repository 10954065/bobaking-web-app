import type { Prisma } from "@prisma/client";
import { env } from "@/lib/env";
import type {
  CreatePaymentIntentParams,
  PaymentIntentResult,
  PaymentProvider,
  PaymentProviderStatus,
  RefundResult,
} from "@/modules/payments/providers/payment-provider.interface";

const API_BASE = "https://api.paystack.co";

function authHeaders() {
  return { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" };
}

function toPesewas(amount: Prisma.Decimal | number): number {
  return Math.round(Number(amount) * 100);
}

/**
 * Real Ghana Mobile Money (and card) via Paystack's hosted checkout
 * (Initialize Transaction), which auto-offers MTN MoMo / Vodafone Cash /
 * AirtelTigo Money and card as payment channels for a GHS transaction —
 * this is deliberately the hosted-redirect API, not Paystack's raw Charge
 * API (which would mean handling OTP/provider-specific phone formats
 * ourselves). Reused as-is for the CARD payment method too — see
 * getProvider() in payment.service.ts — since it's the same hosted page
 * either way, just a different channel the customer picks on it. The
 * customer's browser is sent to `redirectUrl`; Paystack calls our webhook
 * (api/webhooks/paystack) when they finish, which reconciles through the
 * same processWebhookEvent() path used by every other provider.
 *
 * Only used once PAYSTACK_SECRET_KEY is set — see getProvider() in
 * payment.service.ts, which falls back to MobileMoneyDevProvider until then.
 */
export class PaystackMobileMoneyProvider implements PaymentProvider {
  readonly name = "paystack";

  async createIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    const email = (params.metadata?.email as string | undefined) || `order-${params.orderId}@guest.flicksandlicks.local`;
    const trackingToken = params.metadata?.trackingToken as string | undefined;
    const reference = `flicks-${params.orderId}-${Date.now()}`;

    const response = await fetch(`${API_BASE}/transaction/initialize`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        email,
        amount: toPesewas(params.amount),
        currency: params.currency,
        reference,
        channels: ["mobile_money", "card"],
        callback_url: trackingToken && env.APP_URL ? `${env.APP_URL}/track/${trackingToken}` : undefined,
        metadata: { orderId: params.orderId },
      }),
    });
    const json = (await response.json()) as { status: boolean; message?: string; data?: { authorization_url: string; reference: string } };
    if (!response.ok || !json.status || !json.data) {
      throw new Error(json.message ?? `Paystack initialize failed (${response.status})`);
    }

    return { providerReference: json.data.reference, status: "PENDING", redirectUrl: json.data.authorization_url };
  }

  async verify(providerReference: string): Promise<{ status: PaymentProviderStatus }> {
    const response = await fetch(`${API_BASE}/transaction/verify/${encodeURIComponent(providerReference)}`, {
      headers: authHeaders(),
    });
    const json = (await response.json()) as { status: boolean; data?: { status: string } };
    if (!response.ok || !json.status || !json.data) return { status: "PENDING" };

    if (json.data.status === "success") return { status: "SUCCEEDED" };
    if (json.data.status === "failed" || json.data.status === "abandoned") return { status: "FAILED" };
    return { status: "PENDING" };
  }

  async refund(providerReference: string, amount: Prisma.Decimal): Promise<RefundResult> {
    const response = await fetch(`${API_BASE}/refund`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ transaction: providerReference, amount: toPesewas(amount) }),
    });
    const json = (await response.json()) as { status: boolean; data?: { id: number | string } };
    return {
      providerReference: json.data?.id != null ? String(json.data.id) : providerReference,
      status: response.ok && json.status ? "SUCCEEDED" : "FAILED",
    };
  }
}
