import { prisma } from "@/db/client";
import { Prisma, type PaymentMethod } from "@prisma/client";
import { env } from "@/lib/env";
import { CashPaymentProvider } from "@/modules/payments/providers/cash.provider";
import { MobileMoneyDevProvider } from "@/modules/payments/providers/mobile-money-dev.provider";
import { PaystackMobileMoneyProvider } from "@/modules/payments/providers/paystack.provider";
import type { PaymentProvider } from "@/modules/payments/providers/payment-provider.interface";
import {
  initiatePaymentSchema,
  refundPaymentSchema,
  webhookEventSchema,
  type InitiatePaymentInput,
  type RefundPaymentInput,
  type WebhookEventInput,
} from "@/modules/payments/schemas/payment.schema";
import { transitionOrder } from "@/modules/orders/services/order.service";
import { canTransition } from "@/modules/orders/services/order-state-machine";
import { recordAuditLog } from "@/modules/audit/services/audit.service";
import { awardPointsForOrderSafely } from "@/modules/loyalty/services/loyalty.service";

const cashProvider = new CashPaymentProvider();
const mobileMoneyDevProvider = new MobileMoneyDevProvider();
const paystackProvider = new PaystackMobileMoneyProvider();

function getProvider(method: PaymentMethod): PaymentProvider {
  switch (method) {
    case "CASH":
      return cashProvider;
    case "MOBILE_MONEY":
      // Falls back to the dev stand-in until PAYSTACK_SECRET_KEY is set —
      // see PaystackMobileMoneyProvider's doc comment.
      return env.PAYSTACK_SECRET_KEY ? paystackProvider : mobileMoneyDevProvider;
    case "CARD":
      throw new Error("Card payments are not yet supported — no provider is wired up.");
  }
}

/** Creates a payment intent and moves the order into PENDING_PAYMENT. Idempotent on idempotencyKey. */
export async function initiatePayment(input: InitiatePaymentInput) {
  const data = initiatePaymentSchema.parse(input);

  const existing = await prisma.payment.findUnique({ where: { idempotencyKey: data.idempotencyKey } });
  if (existing) return existing;

  const order = await prisma.order.findUniqueOrThrow({ where: { id: data.orderId }, include: { customer: true } });
  const provider = getProvider(data.method);
  const intent = await provider.createIntent({
    orderId: order.id,
    amount: order.total,
    currency: order.currency,
    // Only meaningful to providers that redirect to a hosted checkout
    // (Paystack) — email is required there even though it's optional on our
    // own guest checkout form, and trackingToken builds the return-trip URL.
    // Both are no-ops for providers that ignore metadata (cash, the dev stub).
    metadata: { email: order.customer.email ?? undefined, trackingToken: order.trackingToken },
  });

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      method: data.method,
      provider: provider.name,
      providerReference: intent.providerReference,
      amount: order.total,
      currency: order.currency,
      status: "PENDING",
      idempotencyKey: data.idempotencyKey,
      initiatedByUserId: data.initiatedByUserId,
      metadata: intent.redirectUrl ? { redirectUrl: intent.redirectUrl } : undefined,
    },
  });

  if (canTransition(order.status, "PENDING_PAYMENT")) {
    await transitionOrder({
      orderId: order.id,
      toStatus: "PENDING_PAYMENT",
      actorUserId: data.initiatedByUserId ?? null,
      reason: `Payment initiated via ${provider.name}`,
    });
  }

  return payment;
}

/** Staff confirms cash was physically received at the counter — the only way a CASH payment ever succeeds. */
export async function confirmCashPayment(paymentId: string, actorUserId: string) {
  const payment = await prisma.payment.update({ where: { id: paymentId }, data: { status: "SUCCEEDED" } });
  const order = await prisma.order.findUniqueOrThrow({ where: { id: payment.orderId } });

  if (canTransition(order.status, "CONFIRMED")) {
    await transitionOrder({
      orderId: order.id,
      toStatus: "CONFIRMED",
      actorUserId,
      reason: "Cash payment confirmed at counter",
    });
  }

  await awardPointsForOrderSafely(order.id);

  return payment;
}

/**
 * Handles a payment provider webhook. Deduped by (provider, externalId) via
 * PaymentWebhookEvent's unique constraint — a retried delivery of the same
 * event is detected either by the pre-check or, under a race, by the unique
 * constraint on insert (caught below), so it is never processed twice.
 */
export async function processWebhookEvent(input: WebhookEventInput) {
  const data = webhookEventSchema.parse(input);

  if (data.externalId) {
    const existing = await prisma.paymentWebhookEvent.findUnique({
      where: { provider_externalId: { provider: data.provider, externalId: data.externalId } },
    });
    if (existing?.processedAt) {
      return { alreadyProcessed: true as const };
    }
  }

  let eventRecordId: string;
  try {
    const eventRecord = await prisma.paymentWebhookEvent.create({
      data: {
        provider: data.provider,
        externalId: data.externalId,
        eventType: data.eventType,
        payload: data satisfies Prisma.InputJsonValue,
      },
    });
    eventRecordId = eventRecord.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Lost the race to a concurrent delivery of the same event — it's being handled elsewhere.
      return { alreadyProcessed: true as const };
    }
    throw error;
  }

  const payment = await prisma.payment.findUnique({ where: { providerReference: data.providerReference } });
  if (!payment) {
    throw new Error(`No payment found for provider reference ${data.providerReference}`);
  }

  await prisma.payment.update({ where: { id: payment.id }, data: { status: data.status } });

  const order = await prisma.order.findUniqueOrThrow({ where: { id: payment.orderId } });
  if (data.status === "SUCCEEDED" && canTransition(order.status, "CONFIRMED")) {
    await transitionOrder({
      orderId: order.id,
      toStatus: "CONFIRMED",
      actorUserId: null,
      reason: `Payment confirmed via ${data.provider} webhook`,
    });
    await awardPointsForOrderSafely(order.id);
  } else if (data.status === "FAILED" && canTransition(order.status, "PAYMENT_FAILED")) {
    await transitionOrder({
      orderId: order.id,
      toStatus: "PAYMENT_FAILED",
      actorUserId: null,
      reason: `Payment failed via ${data.provider} webhook`,
    });
  }

  await prisma.paymentWebhookEvent.update({ where: { id: eventRecordId }, data: { processedAt: new Date() } });

  return { alreadyProcessed: false as const, paymentId: payment.id };
}

export async function refundPayment(input: RefundPaymentInput) {
  const data = refundPaymentSchema.parse(input);
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: data.paymentId },
    include: { refunds: true },
  });

  if (payment.status !== "SUCCEEDED" && payment.status !== "PARTIALLY_REFUNDED") {
    throw new Error(`Cannot refund a payment with status ${payment.status}.`);
  }

  const alreadyRefunded = payment.refunds
    .filter((r) => r.status === "SUCCEEDED")
    .reduce((sum, r) => sum.plus(r.amount), new Prisma.Decimal(0));
  const remaining = payment.amount.minus(alreadyRefunded);
  const refundAmount = new Prisma.Decimal(data.amount);

  if (refundAmount.greaterThan(remaining)) {
    throw new Error(`Refund amount (${refundAmount}) exceeds the remaining refundable balance (${remaining}).`);
  }

  const provider = getProvider(payment.method);
  const result = await provider.refund(payment.providerReference ?? "", refundAmount);

  const refund = await prisma.refund.create({
    data: {
      paymentId: payment.id,
      amount: refundAmount,
      reason: data.reason,
      status: result.status,
      initiatedByUserId: data.initiatedByUserId,
      providerReference: result.providerReference,
    },
  });

  const newTotalRefunded = alreadyRefunded.plus(result.status === "SUCCEEDED" ? refundAmount : 0);
  const newPaymentStatus = newTotalRefunded.greaterThanOrEqualTo(payment.amount)
    ? "REFUNDED"
    : newTotalRefunded.greaterThan(0)
      ? "PARTIALLY_REFUNDED"
      : payment.status;
  await prisma.payment.update({ where: { id: payment.id }, data: { status: newPaymentStatus } });

  await recordAuditLog({
    actorUserId: data.initiatedByUserId ?? null,
    action: "payment.refunded",
    resourceType: "Payment",
    resourceId: payment.id,
    metadata: { amount: refundAmount.toString(), reason: data.reason ?? null },
  });

  return refund;
}

/**
 * Refunds whatever remains uncollected-back on a payment, without the caller
 * having to compute the remaining balance themselves (the common case is
 * "refund it all"). Returns null for a payment with nothing left to refund
 * (already fully refunded, or never succeeded) instead of throwing — used by
 * rejectOrderAction (pos.actions.ts) as an automatic consequence of the
 * branch declining a paid order, not a discretionary refund decision, so it
 * intentionally does not require its own payments:refund permission check.
 */
export async function refundRemainingBalance(paymentId: string, input: { reason?: string; initiatedByUserId?: string }) {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { refunds: true } });
  if (payment.status !== "SUCCEEDED" && payment.status !== "PARTIALLY_REFUNDED") return null;

  const alreadyRefunded = payment.refunds
    .filter((r) => r.status === "SUCCEEDED")
    .reduce((sum, r) => sum.plus(r.amount), new Prisma.Decimal(0));
  const remaining = payment.amount.minus(alreadyRefunded);
  if (remaining.lessThanOrEqualTo(0)) return null;

  return refundPayment({ paymentId, amount: Number(remaining), reason: input.reason, initiatedByUserId: input.initiatedByUserId });
}
