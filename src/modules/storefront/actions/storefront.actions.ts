"use server";

import { prisma } from "@/db/client";
import { getRequestIp, enforceRateLimit } from "@/lib/rate-limit";
import { listBranches } from "@/modules/branches/services/branch.service";
import { listCategories } from "@/modules/categories/services/category.service";
import { listPosProducts, type PosProduct } from "@/modules/pos/services/pos-catalog.service";
import { placeStorefrontOrder } from "@/modules/storefront/services/storefront.service";
import type { PlaceStorefrontOrderInput } from "@/modules/storefront/schemas/storefront.schema";
import { initiatePayment } from "@/modules/payments/services/payment.service";
import { processWebhookEvent } from "@/modules/payments/services/payment.service";
import { getOrderById } from "@/modules/orders/services/order.service";

export interface StorefrontBranch {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

/** No auth — this is the public "choose a branch" step of the customer storefront. */
export async function getStorefrontBranchesAction(): Promise<StorefrontBranch[]> {
  const branches = await listBranches({ status: "ACTIVE" });
  return branches.map((b) => ({
    id: b.id,
    name: b.name,
    address: b.address,
    latitude: b.latitude != null ? Number(b.latitude) : null,
    longitude: b.longitude != null ? Number(b.longitude) : null,
  }));
}

export interface StorefrontMenu {
  categories: { id: string; name: string }[];
  products: PosProduct[];
}

export async function getStorefrontMenuAction(branchId: string): Promise<StorefrontMenu> {
  const [categories, products] = await Promise.all([listCategories(), listPosProducts(branchId)]);
  return { categories: categories.map((c) => ({ id: c.id, name: c.name })), products };
}

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

/** Rate-limited per IP — this is the one action a bot could hammer to spam-create orders/customers with no auth in front of it. */
export async function placeStorefrontOrderAction(input: PlaceStorefrontOrderInput): Promise<StorefrontOrderSummary> {
  const ip = await getRequestIp();
  await enforceRateLimit(`storefront-order:${ip}`, { limit: 8, windowSeconds: 900 });

  const order = await placeStorefrontOrder(input);
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    trackingToken: order.trackingToken,
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    taxTotal: Number(order.taxTotal),
    deliveryFee: Number(order.deliveryFee),
  };
}

export interface StorefrontPaymentSummary {
  id: string;
  provider: string;
  status: string;
}

export async function initiateStorefrontPaymentAction(input: {
  orderId: string;
  method: "CASH" | "MOBILE_MONEY";
}): Promise<StorefrontPaymentSummary> {
  const ip = await getRequestIp();
  await enforceRateLimit(`storefront-payment:${ip}`, { limit: 15, windowSeconds: 900 });

  const payment = await initiatePayment({
    orderId: input.orderId,
    method: input.method,
    idempotencyKey: `storefront-${input.orderId}-${input.method}`,
  });
  return { id: payment.id, provider: payment.provider, status: payment.status };
}

/**
 * DEV ONLY: stands in for the real Mobile Money gateway calling our webhook
 * once the customer completes payment on their own phone — see
 * MobileMoneyDevProvider and the identical dev-stub button in the internal
 * order desk's CheckoutFlow. No real gateway is wired up yet.
 */
export async function simulateStorefrontPaymentAction(paymentId: string): Promise<{ status: string | null }> {
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
}
