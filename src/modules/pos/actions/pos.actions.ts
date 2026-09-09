"use server";

import { prisma } from "@/db/client";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requirePermission, requireAnyPermission } from "@/modules/auth/services/authorization.service";
import { UserFacingError, withSafeErrors } from "@/lib/errors";
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
  assertDevPaymentSimulationAllowed,
} from "@/modules/payments/services/payment.service";
import { recordAuditLog } from "@/modules/audit/services/audit.service";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new UserFacingError("Your session has expired. Please sign in again.");
  return userId;
}

async function loadCartOrThrow(cartId: string) {
  const cart = await getCartById(cartId);
  if (!cart) throw new UserFacingError("That cart could no longer be found. Please start again.");
  return cart;
}

export const searchCustomersAction = withSafeErrors(async (query: string) => {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "customers", "read");
  return searchCustomers(query);
}, "Couldn't search customers right now. Please try again.");

export const createCustomerAction = withSafeErrors(async (input: CreateCustomerInput) => {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "customers", "create");
  return createCustomer(input);
}, "Couldn't create that customer right now. Please try again.");

export const createWalkInCustomerAction = withSafeErrors(async () => {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "customers", "create");
  return createWalkInCustomer();
}, "Couldn't start a walk-in order right now. Please try again.");

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

export const listCustomerAddressesAction = withSafeErrors(async (customerId: string): Promise<PosCustomerAddress[]> => {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "customers", "read");
  const addresses = await listCustomerAddresses(customerId);
  return addresses.map(toPosCustomerAddress);
}, "Couldn't load addresses right now. Please try again.");

/** Gated by customers.create (not update) — this creates a new address record, it never modifies the customer row itself. */
export const createCustomerAddressAction = withSafeErrors(async (
  customerId: string,
  input: CreateCustomerAddressInput
): Promise<PosCustomerAddress> => {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "customers", "create");
  const address = await addCustomerAddress(customerId, input);
  return toPosCustomerAddress(address);
}, "Couldn't save that address right now. Please try again.");

export const getOrCreateCartAction = withSafeErrors(async (params: {
  branchId: string;
  customerId: string;
  type: "DELIVERY" | "PICKUP" | "DINE_IN";
}): Promise<PosCart> => {
  const userId = await requireUserId();
  await requirePermission(userId, "orders", "create", params.branchId);
  const cart = await getOrCreateActiveCart(params);
  return toPosCart(cart);
}, "Couldn't open a cart right now. Please try again.");

export const getPosProductsAction = withSafeErrors(async (branchId: string) => {
  const userId = await requireUserId();
  await requirePermission(userId, "products", "read", branchId);
  return listPosProducts(branchId);
}, "Couldn't load products right now. Please try again.");

export const addItemToCartAction = withSafeErrors(async (cartId: string, input: AddCartItemInput): Promise<PosCart> => {
  const userId = await requireUserId();
  const cart = await loadCartOrThrow(cartId);
  await requirePermission(userId, "orders", "create", cart.branchId);

  await addItemToCart(cartId, input);
  return toPosCart(await loadCartOrThrow(cartId));
}, "Couldn't add that item right now. Please try again.");

export const updateCartItemQuantityAction = withSafeErrors(async (cartId: string, cartItemId: string, quantity: number): Promise<PosCart> => {
  const userId = await requireUserId();
  const cart = await loadCartOrThrow(cartId);
  await requirePermission(userId, "orders", "create", cart.branchId);

  await updateCartItemQuantity(cartItemId, { quantity });
  return toPosCart(await loadCartOrThrow(cartId));
}, "Couldn't update that item right now. Please try again.");

export const removeCartItemAction = withSafeErrors(async (cartId: string, cartItemId: string): Promise<PosCart> => {
  const userId = await requireUserId();
  const cart = await loadCartOrThrow(cartId);
  await requirePermission(userId, "orders", "create", cart.branchId);

  await removeCartItem(cartItemId);
  return toPosCart(await loadCartOrThrow(cartId));
}, "Couldn't remove that item right now. Please try again.");

export const checkoutAction = withSafeErrors(async (input: Omit<CheckoutInput, "placedByUserId">) => {
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
}, "We couldn't place that order right now. Please try again in a moment.");

export const initiatePaymentAction = withSafeErrors(async (input: { orderId: string; method: "CASH" | "MOBILE_MONEY" }) => {
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
}, "Couldn't start payment right now. Please try again.");

export const confirmCashPaymentAction = withSafeErrors(async (paymentId: string) => {
  const userId = await requireUserId();
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: true } });
  await requirePermission(userId, "payments", "create", payment.order.branchId);

  await confirmCashPayment(paymentId, userId);
  const order = await getOrderById(payment.orderId);
  return { status: order?.status ?? null };
}, "Couldn't confirm that payment right now. Please try again.");

/**
 * A POS-taken order has already been "accepted" by virtue of being placed
 * at the counter — there's no separate review step the way a customer
 * self-service order might need, so once payment is confirmed we walk it
 * straight to the kitchen rather than leaving staff to click through two
 * more manual transitions.
 */
export const sendToKitchenAction = withSafeErrors(async (orderId: string) => {
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
}, "Couldn't send that order to the kitchen right now. Please try again.");

/**
 * The branch's explicit "no" — a storefront order reaching CONFIRMED only
 * means payment landed, never that the branch can actually fulfil it (out of
 * stock, closing, too busy). Declining here is what the customer-facing copy
 * on PaymentStep/track page is contrasted against: payment succeeding must
 * never read as the order being accepted, and this is the other half of that
 * — a real path to "not accepted" alongside sendToKitchenAction's "accepted".
 */
export const rejectOrderAction = withSafeErrors(async (orderId: string, reason?: string) => {
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
}, "Couldn't decline that order right now. Please try again.");

/**
 * A discretionary refund initiated by finance/admin (partial or full) — gated
 * on payments:refund, unlike the automatic one inside rejectOrderAction.
 */
export const refundOrderAction = withSafeErrors(async (paymentId: string, amount: number, reason?: string) => {
  const userId = await requireUserId();
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: true } });
  await requirePermission(userId, "payments", "refund", payment.order.branchId);

  const refund = await refundPayment({ paymentId, amount, reason: reason?.trim() || undefined, initiatedByUserId: userId });
  // Server actions can only return plain-serializable data across the
  // client boundary — Prisma's Decimal (refund.amount) is a class instance,
  // not a plain object, and fails that check silently in the console.
  return { id: refund.id, status: refund.status, amount: Number(refund.amount) };
}, "Couldn't process that refund right now. Please try again.");

/**
 * DEV ONLY: stands in for the real Mobile Money gateway calling our webhook
 * endpoint once the customer completes payment on their phone. There is no
 * real gateway wired up yet (see MobileMoneyDevProvider) — this lets staff
 * test the full POS flow without one. Must not exist once a real provider
 * ships; it bypasses the one thing that actually matters (server-side
 * verification of a real payment).
 */
export const devSimulateMobileMoneySuccessAction = withSafeErrors(async (paymentId: string) => {
  assertDevPaymentSimulationAllowed();

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
}, "Couldn't confirm payment right now. Please try again.");
