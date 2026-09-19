import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/db/client";
import { getRequestIp, enforceRateLimit } from "@/lib/rate-limit";
import { mobileErrorResponse } from "@/lib/mobile-api";
import { assertDevPaymentSimulationAllowed, processWebhookEvent } from "@/modules/payments/services/payment.service";
import { getOrderById } from "@/modules/orders/services/order.service";

export const dynamic = "force-dynamic";

/**
 * DEV ONLY — mobile counterpart to simulateStorefrontPaymentAction
 * (storefront.actions.ts). Stands in for a real Mobile Money/Paystack
 * gateway calling our webhook once the customer completes payment on their
 * phone; assertDevPaymentSimulationAllowed() refuses this in production
 * unless ALLOW_DEV_PAYMENT_SIMULATION is explicitly set.
 */
export async function POST(request: NextRequest) {
  try {
    assertDevPaymentSimulationAllowed();

    const ip = await getRequestIp();
    await enforceRateLimit(`storefront-payment-sim:${ip}`, { limit: 15, windowSeconds: 900 });

    const body = await request.json().catch(() => ({}));
    const { paymentId } = body as { paymentId?: string };
    if (!paymentId) {
      return NextResponse.json({ error: "paymentId is required." }, { status: 400 });
    }

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    await processWebhookEvent({
      provider: "mobile-money-dev",
      externalId: `dev-sim-${paymentId}-${Date.now()}`,
      eventType: "payment.succeeded",
      providerReference: payment.providerReference!,
      status: "SUCCEEDED",
    });

    const order = await getOrderById(payment.orderId);
    return NextResponse.json({ status: order?.status ?? null });
  } catch (error) {
    return mobileErrorResponse(error, "Couldn't confirm payment right now. Please try again.");
  }
}
