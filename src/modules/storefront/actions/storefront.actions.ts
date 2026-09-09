"use server";

import { prisma } from "@/db/client";
import { getRequestIp, enforceRateLimit } from "@/lib/rate-limit";
import { withSafeErrors, UserFacingError } from "@/lib/errors";
import { listBranches } from "@/modules/branches/services/branch.service";
import { listCategories } from "@/modules/categories/services/category.service";
import { listPosProducts, type PosProduct } from "@/modules/pos/services/pos-catalog.service";
import { placeStorefrontOrder } from "@/modules/storefront/services/storefront.service";
import type { PlaceStorefrontOrderInput } from "@/modules/storefront/schemas/storefront.schema";
import { initiatePayment } from "@/modules/payments/services/payment.service";
import { processWebhookEvent, assertDevPaymentSimulationAllowed } from "@/modules/payments/services/payment.service";
import { getOrderById } from "@/modules/orders/services/order.service";
import { getCurrentCustomer } from "@/modules/customer-auth/services/current-customer.service";

export interface StorefrontBranch {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

/** No auth — this is the public "choose a branch" step of the customer storefront. */
export const getStorefrontBranchesAction = withSafeErrors(async (): Promise<StorefrontBranch[]> => {
  const branches = await listBranches({ status: "ACTIVE" });
  return branches.map((b) => ({
    id: b.id,
    name: b.name,
    address: b.address,
    latitude: b.latitude != null ? Number(b.latitude) : null,
    longitude: b.longitude != null ? Number(b.longitude) : null,
  }));
}, "Couldn't load branches right now. Please refresh and try again.");

export interface StorefrontMenu {
  categories: { id: string; name: string }[];
  products: PosProduct[];
}

export const getStorefrontMenuAction = withSafeErrors(async (branchId: string): Promise<StorefrontMenu> => {
  const [categories, products] = await Promise.all([listCategories(), listPosProducts(branchId)]);
  return { categories: categories.map((c) => ({ id: c.id, name: c.name })), products };
}, "Couldn't load the menu right now. Please try again.");

export interface StorefrontOrderSummary {
  id: string;
  orderNumber: string;
  /** The secure link identifier for /track/[token] — never the guessable orderNumber. */
  trackingToken: string;
  total: number;
  subtotal: number;
  taxTotal: number;
  deliveryFee: number;
}

/**
 * Requires a verified customer session — identity comes from there, never
 * from the request body, so nobody can place an order as a phone number
 * they haven't proven via OTP (see current-customer.service.ts). Also
 * rate-limited per IP on top of that.
 */
export const placeStorefrontOrderAction = withSafeErrors(async (input: PlaceStorefrontOrderInput): Promise<StorefrontOrderSummary> => {
  const customer = await getCurrentCustomer();
  if (!customer) {
    throw new UserFacingError("Please verify your phone number before placing an order.");
  }

  const ip = await getRequestIp();
  await enforceRateLimit(`storefront-order:${ip}`, { limit: 8, windowSeconds: 900 });

  const order = await placeStorefrontOrder(customer.id, input);
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    trackingToken: order.trackingToken,
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    taxTotal: Number(order.taxTotal),
    deliveryFee: Number(order.deliveryFee),
  };
}, "We couldn't place your order right now. Please try again in a moment.");

export interface StorefrontPaymentSummary {
  id: string;
  provider: string;
  status: string;
  /** Set only when the provider needs the customer's browser sent to its
   * own hosted checkout (real Paystack Mobile Money) — see PaymentStep.tsx. */
  redirectUrl: string | null;
}

export const initiateStorefrontPaymentAction = withSafeErrors(async (input: {
  orderId: string;
  method: "CASH" | "MOBILE_MONEY" | "CARD";
}): Promise<StorefrontPaymentSummary> => {
  const ip = await getRequestIp();
  await enforceRateLimit(`storefront-payment:${ip}`, { limit: 15, windowSeconds: 900 });

  const payment = await initiatePayment({
    orderId: input.orderId,
    method: input.method,
    idempotencyKey: `storefront-${input.orderId}-${input.method}`,
  });
  const metadata = payment.metadata as { redirectUrl?: string } | null;
  return { id: payment.id, provider: payment.provider, status: payment.status, redirectUrl: metadata?.redirectUrl ?? null };
}, "Couldn't start payment right now. Please try again.");

/**
 * DEV ONLY: stands in for the real Mobile Money gateway calling our webhook
 * once the customer completes payment on their own phone — see
 * MobileMoneyDevProvider and the identical dev-stub button in the internal
 * order desk's CheckoutFlow. No real gateway is wired up yet.
 */
export const simulateStorefrontPaymentAction = withSafeErrors(async (paymentId: string): Promise<{ status: string | null }> => {
  assertDevPaymentSimulationAllowed();

  const ip = await getRequestIp();
  await enforceRateLimit(`storefront-payment-sim:${ip}`, { limit: 15, windowSeconds: 900 });

  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  await processWebhookEvent({
    provider: "mobile-money-dev",
    externalId: `dev-sim-${paymentId}-${Date.now()}`,
    eventType: "payment.succeeded",
    providerReference: payment.providerReference!,
    status: "SUCCEEDED",
  });

  const order = await getOrderById(payment.orderId);
  return { status: order?.status ?? null };
}, "Couldn't confirm payment right now. Please try again.");
