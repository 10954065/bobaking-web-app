import { prisma } from "@/db/client";
import {
  createCartSchema,
  addCartItemSchema,
  updateCartItemSchema,
  type CreateCartInput,
  type AddCartItemInput,
  type UpdateCartItemInput,
} from "@/modules/cart/schemas/cart.schema";

const cartWithItems = {
  include: {
    items: {
      // branchOverrides is intentionally unfiltered here (Prisma can't filter
      // a nested include by a column — cart.branchId — from the same query);
      // callers that need the resolved price pick the matching row by
      // cart.branchId themselves (see pos-catalog.service.ts's toPosCart).
      include: {
        product: { include: { branchOverrides: true } },
        modifiers: { include: { modifierOption: true } },
      },
      orderBy: { createdAt: "asc" as const },
    },
  },
};

export type CartWithItems = NonNullable<Awaited<ReturnType<typeof getCartById>>>;

export async function getCartById(cartId: string) {
  return prisma.cart.findUnique({ where: { id: cartId }, ...cartWithItems });
}

/** One ACTIVE cart per customer+branch+type at a time — reuse it instead of piling up abandoned carts. */
export async function getOrCreateActiveCart(input: CreateCartInput) {
  const data = createCartSchema.parse(input);

  const existing = await prisma.cart.findFirst({
    where: { customerId: data.customerId, branchId: data.branchId, type: data.type, status: "ACTIVE" },
    ...cartWithItems,
  });
  if (existing) return existing;

  const created = await prisma.cart.create({ data });
  return getCartById(created.id) as Promise<NonNullable<Awaited<ReturnType<typeof getCartById>>>>;
}

export async function addItemToCart(cartId: string, input: AddCartItemInput) {
  const data = addCartItemSchema.parse(input);

  await prisma.cartItem.create({
    data: {
      cartId,
      productId: data.productId,
      quantity: data.quantity,
      notes: data.notes,
      modifiers: { create: data.modifierOptionIds.map((modifierOptionId) => ({ modifierOptionId })) },
    },
  });

  return getCartById(cartId);
}

/** Wipes every line from a cart without deleting the cart itself — see
 * placeStorefrontOrder's use of this: the storefront submits a cart's
 * complete, authoritative contents in one call (unlike the POS, which
 * builds a cart up incrementally across separate requests), so a retry
 * after a dropped response, or a stale abandoned cart resurrected for a
 * repeat guest, must replace rather than append to whatever's already there. */
export async function clearCartItems(cartId: string) {
  await prisma.cartItem.deleteMany({ where: { cartId } });
}

export async function updateCartItemQuantity(cartItemId: string, input: UpdateCartItemInput) {
  const data = updateCartItemSchema.parse(input);
  return prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity: data.quantity } });
}

export async function removeCartItem(cartItemId: string) {
  await prisma.cartItem.delete({ where: { id: cartItemId } });
}

export async function abandonCart(cartId: string) {
  return prisma.cart.update({ where: { id: cartId }, data: { status: "ABANDONED" } });
}
