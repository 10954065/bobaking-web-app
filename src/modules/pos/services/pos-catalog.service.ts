import { prisma } from "@/db/client";
import type { CartWithItems } from "@/modules/cart/services/cart.service";

export interface PosModifierOption {
  id: string;
  name: string;
  priceDelta: number;
}

export interface PosModifierGroup {
  id: string;
  name: string;
  selectionType: "SINGLE" | "MULTIPLE";
  isRequired: boolean;
  minSelect: number;
  maxSelect: number | null;
  options: PosModifierOption[];
}

export interface PosProduct {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  isAvailable: boolean;
  imageUrl: string | null;
  modifierGroups: PosModifierGroup[];
}

/** Branch-resolved products with their modifier groups, flattened to plain numbers for the client component. */
export async function listPosProducts(branchId: string): Promise<PosProduct[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      branchOverrides: { where: { branchId } },
      modifierGroups: {
        orderBy: { sortOrder: "asc" },
        include: {
          modifierGroup: {
            include: { options: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return products.map((product) => {
    const override = product.branchOverrides[0];
    return {
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      price: Number(override?.price ?? product.basePrice),
      isAvailable: product.isActive && (override?.isAvailable ?? true),
      imageUrl: product.imageUrl,
      modifierGroups: product.modifierGroups.map((link) => ({
        id: link.modifierGroup.id,
        name: link.modifierGroup.name,
        selectionType: link.modifierGroup.selectionType,
        isRequired: link.modifierGroup.isRequired,
        minSelect: link.modifierGroup.minSelect,
        maxSelect: link.modifierGroup.maxSelect,
        options: link.modifierGroup.options.map((o) => ({
          id: o.id,
          name: o.name,
          priceDelta: Number(o.priceDelta),
        })),
      })),
    };
  });
}

export interface PosCartItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  notes: string | null;
  unitPrice: number;
  modifiersTotal: number;
  lineTotal: number;
  modifiers: { id: string; name: string; priceDelta: number }[];
}

export interface PosCart {
  id: string;
  branchId: string;
  customerId: string;
  type: string;
  subtotal: number;
  items: PosCartItem[];
}

/** Flattens a CartWithItems into plain numbers, resolving each line's price against the cart's own branch. */
export function toPosCart(cart: CartWithItems): PosCart {
  const items: PosCartItem[] = cart.items.map((item) => {
    const override = item.product.branchOverrides.find((o) => o.branchId === cart.branchId);
    const unitPrice = Number(override?.price ?? item.product.basePrice);
    const modifiers = item.modifiers.map((m) => ({
      id: m.modifierOption.id,
      name: m.modifierOption.name,
      priceDelta: Number(m.modifierOption.priceDelta),
    }));
    const modifiersTotal = modifiers.reduce((sum, m) => sum + m.priceDelta, 0);
    const lineTotal = (unitPrice + modifiersTotal) * item.quantity;

    return {
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
      notes: item.notes,
      unitPrice,
      modifiersTotal,
      lineTotal,
      modifiers,
    };
  });

  return {
    id: cart.id,
    branchId: cart.branchId,
    customerId: cart.customerId,
    type: cart.type,
    subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
    items,
  };
}
