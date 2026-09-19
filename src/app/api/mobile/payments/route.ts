import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestIp, enforceRateLimit } from "@/lib/rate-limit";
import { mobileErrorResponse } from "@/lib/mobile-api";
import { initiatePayment } from "@/modules/payments/services/payment.service";

export const dynamic = "force-dynamic";

/** Mobile counterpart to initiateStorefrontPaymentAction (storefront.actions.ts). */
export async function POST(request: NextRequest) {
  try {
    const ip = await getRequestIp();
    await enforceRateLimit(`storefront-payment:${ip}`, { limit: 15, windowSeconds: 900 });

    const body = await request.json().catch(() => ({}));
    const { orderId, method } = body as { orderId?: string; method?: "CASH" | "MOBILE_MONEY" | "CARD" };
    if (!orderId || !method) {
      return NextResponse.json({ error: "orderId and method are required." }, { status: 400 });
    }

    const payment = await initiatePayment({
      orderId,
      method,
      idempotencyKey: `storefront-${orderId}-${method}`,
    });
    const metadata = payment.metadata as { redirectUrl?: string } | null;
    return NextResponse.json({
      id: payment.id,
      provider: payment.provider,
      status: payment.status,
      redirectUrl: metadata?.redirectUrl ?? null,
    });
  } catch (error) {
    return mobileErrorResponse(error, "Couldn't start payment right now. Please try again.");
  }
}
