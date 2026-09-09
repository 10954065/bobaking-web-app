import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { processWebhookEvent } from "@/modules/payments/services/payment.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PaystackChargeEvent {
  event: string;
  data: { reference: string; status: string; id: number };
}

/**
 * Paystack signs every webhook with HMAC-SHA512 of the raw body using the
 * secret key — verified here so a request can never fake a payment success
 * without knowing PAYSTACK_SECRET_KEY. Returns 200 even for events we don't
 * act on (Paystack retries on non-2xx) and 401 only for a bad/missing
 * signature, never leaking which case failed.
 */
function isValidSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !env.PAYSTACK_SECRET_KEY) return false;
  const expected = createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");
  return expectedBuf.length === signatureBuf.length && timingSafeEqual(expectedBuf, signatureBuf);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!isValidSignature(rawBody, request.headers.get("x-paystack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(rawBody) as PaystackChargeEvent;
  if (event.event !== "charge.success" && event.event !== "charge.failed") {
    return new Response("Ignored", { status: 200 });
  }

  await processWebhookEvent({
    provider: "paystack",
    externalId: String(event.data.id),
    eventType: event.event,
    providerReference: event.data.reference,
    status: event.event === "charge.success" ? "SUCCEEDED" : "FAILED",
  });

  return new Response("OK", { status: 200 });
}
