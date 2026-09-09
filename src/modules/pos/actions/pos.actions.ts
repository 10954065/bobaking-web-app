"use server";

import { prisma } from "@/db/client";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requirePermission, requireAnyPermission } from "@/modules/auth/services/authorization.service";
import {
  searchCustomers,
  createCustomer,
  createWalkInCustomer,
  listCustomerAddresses,
  addCustomerAddress,
} from "@/modules/customers/services/customer.service";
import type { CreateCustomerInput, CreateCustomerAddressInput } from "@/modules/customers/schemas/customer.schema";
import {
  getOrCreateActiveCart,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  getCartById,
} from "@/modules/cart/services/cart.service";
import type { AddCartItemInput } from "@/modules/cart/schemas/cart.schema";
import { listPosProducts, toPosCart, type PosCart } from "@/modules/pos/services/pos-catalog.service";
import { checkout, type CheckoutInput } from "@/modules/orders/services/checkout.service";
import { getOrderById, transitionOrder } from "@/modules/orders/services/order.service";
import { canTransition } from "@/modules/orders/services/order-state-machine";
import {
  initiatePayment,
  confirmCashPayment,
  processWebhookEvent,
  refundPayment,
  refundRemainingBalance,
} from "@/modules/payments/services/payment.service";
import { recordAuditLog } from "@/modules/audit/services/audit.service";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

async function loadCartOrThrow(cartId: string) {
  const cart = await getCartById(cartId);
  if (!cart) throw new Error("Cart not found");
  return cart;
}

export async function searchCustomersAction(query: string) {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "customers", "read");
  return searchCustomers(query);
}

export async function createCustomerAction(input: CreateCustomerInput) {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "customers", "create");
  return createCustomer(input);
}

export async function createWalkInCustomerAction() {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "customers", "create");
  return createWalkInCustomer();
}

export interface PosCustomerAddress {
  id: string;
  label: string | null;
  addressLine1: string;
  addressLine2: string | null;
  area: string | null;
  city: string | null;
  landmark: string | null;
  isDefault: boolean;
}

function toPosCustomerAddress(address: {
  id: string;
  label: string | null;
  addressLine1: string;
  addressLine2: string | null;
  area: string | null;
  city: string | null;
  landmark: string | null;
  isDefault: boolean;
}): PosCustomerAddress {
  return {
    id: address.id,
    label: address.label,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    area: address.area,
    city: address.city,
    landmark: address.landmark,
    isDefault: address.isDefault,
  };
}

export async function listCustomerAddressesAction(customerId: string): Promise<PosCustomerAddress[]> {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "customers", "read");
  const addresses = await listCustomerAddresses(customerId);
  return addresses.map(toPosCustomerAddress);
}

/** Gated by customers.create (not update) — this creates a new address record, it never modifies the customer row itself. */
export async function createCustomerAddressAction(
  customerId: string,
  input: CreateCustomerAddressInput
): Promise<PosCustomerAddress> {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "customers", "create");
  const address = await addCustomerAddress(customerId, input);
  return toPosCustomerAddress(address);
}

export async function getOrCreateCartAction(params: {
  branchId: string;
  customerId: string;
  type: "DELIVERY" | "PICKUP" | "DINE_IN";
}): Promise<PosCart> {
  const userId = await requireUserId();
  await requirePermission(userId, "orders", "create", params.branchId);
  const cart = await getOrCreateActiveCart(params);
  return toPosCart(cart);
}

export async function getPosProductsAction(branchId: string) {
  const userId = await requireUserId();
  await requirePermission(userId, "products", "read", branchId);
  return listPosProducts(branchId);
}

export async function addItemToCartAction(cartId: string, input: AddCartItemInput): Promise<PosCart> {
  const userId = await requireUserId();
  const cart = await loadCartOrThrow(cartId);
  await requirePermission(userId, "orders", "create", cart.branchId);

  await addItemToCart(cartId, input);
  return toPosCart(await loadCartOrThrow(cartId));
}

export async function updateCartItemQuantityAction(cartId: string, cartItemId: string, quantity: number): Promise<PosCart> {
  const userId = await requireUserId();
  const cart = await loadCartOrThrow(cartId);
  await requirePermission(userId, "orders", "create", cart.branchId);

  await updateCartItemQuantity(cartItemId, { quantity });
  return toPosCart(await loadCartOrThrow(cartId));
}

export async function removeCartItemAction(cartId: string, cartItemId: string): Promise<PosCart> {
  const userId = await requireUserId();
  const cart = await loadCartOrThrow(cartId);
  await requirePermission(userId, "orders", "create", cart.branchId);

  await removeCartItem(cartItemId);
  return toPosCart(await loadCartOrThrow(cartId));
}

export async function checkoutAction(input: Omit<CheckoutInput, "placedByUserId">) {
  const userId = await requireUserId();
  const cart = await loadCartOrThrow(input.cartId);
  await requirePermission(userId, "orders", "create", cart.branchId);

  const order = await checkout({ ...input, placedByUserId: userId });
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    taxTotal: Number(order.taxTotal),
    deliveryFee: Number(order.deliveryFee),
    discountTotal: Number(order.discountTotal),
  };
}

export async function initiatePaymentAction(input: { orderId: string; method: "CASH" | "MOBILE_MONEY" }) {
  const userId = await requireUserId();
  const order = await prisma.order.findUniqueOrThrow({ where: { id: input.orderId } });
  await requirePermission(userId, "payments", "create", order.branchId);

  const payment = await initiatePayment({
    orderId: input.orderId,
    method: input.method,
    idempotencyKey: `pos-${input.orderId}-${input.method}`,
    initiatedByUserId: userId,
  });

  return { id: payment.id, provider: payment.provider, providerReference: payment.providerReference, status: payment.status };
}

export async function confirmCashPaymentAction(paymentId: string) {
  const userId = await requireUserId();
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: true } });
  await requirePermission(userId, "payments", "create", payment.order.branchId);

  await confirmCashPayment(paymentId, userId);
  const order = await getOrderById(payment.orderId);
  return { status: order?.status ?? null };
}

/**
 * A POS-taken order has already been "accepted" by virtue of being placed
 * at the counter — there's no separate review step the way a customer
 * self-service order might need, so once payment is confirmed we walk it
 * straight to the kitchen rather than leaving staff to click through two
 * more manual transitions.
 */
export async function sendToKitchenAction(orderId: string) {
  const userId = await requireUserId();
  let order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  await requirePermission(userId, "orders", "update", order.branchId);

  if (canTransition(order.status, "ACCEPTED")) {
    await transitionOrder({ orderId, toStatus: "ACCEPTED", actorUserId: userId });
    order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  }
  if (canTransition(order.status, "SENT_TO_KITCHEN")) {
    await transitionOrder({ orderId, toStatus: "SENT_TO_KITCHEN", actorUserId: userId });
  }
}

/**
 * The branch's explicit "no" — a storefront order reaching CONFIRMED only
 * means payment landed, never that the branch can actually fulfil it (out of
 * stock, closing, too busy). Declining here is what the customer-facing copy
 * on PaymentStep/track page is contrasted against: payment succeeding must
 * never read as the order being accepted, and this is the other half of that
 * — a real path to "not accepted" alongside sendToKitchenAction's "accepted".
 */
export async function rejectOrderAction(orderId: string, reason?: string) {
  const userId = await requireUserId();
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  await requirePermission(userId, "orders", "update", order.branchId);

  const trimmedReason = reason?.trim() || undefined;
  await transitionOrder({ orderId, toStatus: "REJECTED", actorUserId: userId, reason: trimmedReason });

  // Declining a paid order must never leave the customer's money sitting
  // uncollected on our side — this is a mandatory consequence of the
  // decision to decline, not a separate discretionary refund, so it doesn't
  // require the actor to separately hold payments:refund (see
  // refundRemainingBalance's doc comment). Never blocks the decline itself.
  const payment = await prisma.payment.findFirst({
    where: { orderId, status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED"] } },
    orderBy: { createdAt: "desc" },
  });
  if (payment) {
    await refundRemainingBalance(payment.id, {
      reason: trimmedReason ?? "Order declined by branch",
      initiatedByUserId: userId,
    }).catch(async (error) => {
      await recordAuditLog({
        actorUserId: userId,
        action: "payment.auto_refund_failed",
        resourceType: "Payment",
        resourceId: payment.id,
        metadata: { orderId, error: error instanceof Error ? error.message : String(error) },
      }).catch(() => {});
    });
  }
}

/**
 * A discretionary refund initiated by finance/admin (partial or full) — gated
 * on payments:refund, unlike the automatic one inside rejectOrderAction.
 */
export async function refundOrderAction(paymentId: string, amount: number, reason?: string) {
  const userId = await requireUserId();
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: true } });
  await requirePermission(userId, "payments", "refund", payment.order.branchId);

  return refundPayment({ paymentId, amount, reason: reason?.trim() || undefined, initiatedByUserId: userId });
}

/**
 * DEV ONLY: stands in for the real Mobile Money gateway calling our webhook
 * endpoint once the customer completes payment on their phone. There is no
 * real gateway wired up yet (see MobileMoneyDevProvider) — this lets staff
 * test the full POS flow without one. Must not exist once a real provider
 * ships; it bypasses the one thing that actually matters (server-side
 * verification of a real payment).
 */
export async function devSimulateMobileMoneySuccessAction(paymentId: string) {
  const userId = await requireUserId();
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: true } });
  await requirePermission(userId, "payments", "create", payment.order.branchId);

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
