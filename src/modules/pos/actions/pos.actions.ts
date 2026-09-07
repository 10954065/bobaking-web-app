"use server";

import { prisma } from "@/db/client";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requirePermission, requireAnyPermission } from "@/modules/auth/services/authorization.service";
import { searchCustomers, createCustomer, createWalkInCustomer } from "@/modules/customers/services/customer.service";
import type { CreateCustomerInput } from "@/modules/customers/schemas/customer.schema";
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
import { initiatePayment, confirmCashPayment, processWebhookEvent } from "@/modules/payments/services/payment.service";

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
