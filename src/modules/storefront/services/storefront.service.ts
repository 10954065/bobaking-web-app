import { prisma } from "@/db/client";
import { getOrCreateActiveCart, addItemToCart, clearCartItems } from "@/modules/cart/services/cart.service";
import { checkout } from "@/modules/orders/services/checkout.service";
import type { OrderWithDetails } from "@/modules/orders/services/order.service";
import { placeStorefrontOrderSchema, type PlaceStorefrontOrderInput } from "@/modules/storefront/schemas/storefront.schema";

/**
 * Fills in the profile on the already-identified (OTP-verified) customer —
 * identity itself is never taken from this form, only name/email, which
 * aren't security-sensitive and are fine to keep refreshing on every order.
 */
async function updateCustomerProfile(customerId: string, guest: { firstName: string; lastName: string; email?: string }) {
  return prisma.customer.update({
    where: { id: customerId },
    data: { firstName: guest.firstName, lastName: guest.lastName, email: guest.email, status: "ACTIVE" },
  });
}

/**
 * Converts a storefront cart (submitted whole, since the customer builds it
 * client-side without a staff session in between each add) into a real
 * order: attach the guest's name/email to their already-verified customer
 * record, save the delivery address if any, materialize a Cart + CartItems,
 * then hand off to the same checkout() the internal order desk uses — no
 * separate pricing/discount logic to keep in sync. `customerId` comes from
 * the caller's verified session (see placeStorefrontOrderAction), never from
 * this input, so a client can't place an order as a phone number it hasn't
 * proven ownership of.
 */
export async function placeStorefrontOrder(customerId: string, input: PlaceStorefrontOrderInput): Promise<OrderWithDetails> {
  const data = placeStorefrontOrderSchema.parse(input);

  const customer = await updateCustomerProfile(customerId, data.guest);

  let deliveryAddressId: string | undefined;
  if (data.type === "DELIVERY" && data.deliveryAddress) {
    const address = await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        addressLine1: data.deliveryAddress.addressLine1,
        area: data.deliveryAddress.area,
        landmark: data.deliveryAddress.landmark,
        latitude: data.deliveryAddress.latitude,
        longitude: data.deliveryAddress.longitude,
        isDefault: false,
      },
    });
    deliveryAddressId = address.id;
  }

  const cart = await getOrCreateActiveCart({ branchId: data.branchId, customerId: customer.id, type: data.type });
  if (cart.items.length > 0) {
    // A retry after a dropped response (this same cart, still ACTIVE because
    // checkout() never got far enough to convert it), or a stale abandoned
    // cart resurrected for a repeat guest — either way this submission is
    // the complete order, not an incremental addition. See clearCartItems.
    await clearCartItems(cart.id);
  }
  for (const item of data.items) {
    await addItemToCart(cart.id, {
      productId: item.productId,
      quantity: item.quantity,
      notes: item.notes,
      modifierOptionIds: item.modifierOptionIds,
    });
  }

  // Keyed off the cart, not a fresh random value — a real accidental
  // double-submit reuses the same ACTIVE cart and this same key, so
  // checkout()'s idempotency check returns the existing order instead of
  // creating a duplicate. A genuinely new order gets a fresh cart (the old
  // one is CONVERTED) and therefore a fresh key.
  return checkout({
    cartId: cart.id,
    idempotencyKey: `storefront-${cart.id}`,
    deliveryAddressId,
    notes: data.notes,
  });
}
