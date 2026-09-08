import type { ModifierSelection } from "@/components/pos/ModifierModal";
import type { PosProduct } from "@/modules/pos/services/pos-catalog.service";

export interface LocalCartItem {
  key: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  notes: string;
  modifierOptionIds: string[];
  modifiersLabel: string;
  lineTotal: number;
}

/**
 * Adds a modifier-modal selection to the client-side storefront cart,
 * merging into an existing line when the product + modifiers + notes are
 * identical (same "key") rather than creating a duplicate row — mirrors how
 * a real cart line represents one distinct configuration of a product.
 */
export function addSelectionToCart(cart: LocalCartItem[], product: PosProduct, selection: ModifierSelection): LocalCartItem[] {
  const allOptions = product.modifierGroups.flatMap((g) => g.options);
  const chosen = selection.modifierOptionIds
    .map((id) => allOptions.find((o) => o.id === id))
    .filter((o): o is NonNullable<typeof o> => !!o);
  const modifiersTotal = chosen.reduce((sum, o) => sum + o.priceDelta, 0);
  const unitPrice = product.price + modifiersTotal;
  const key = `${product.id}:${[...selection.modifierOptionIds].sort().join(",")}:${selection.notes}`;

  const existing = cart.find((item) => item.key === key);
  if (existing) {
    return cart.map((item) =>
      item.key === key
        ? { ...item, quantity: item.quantity + selection.quantity, lineTotal: item.unitPrice * (item.quantity + selection.quantity) }
        : item
    );
  }

  return [
    ...cart,
    {
      key,
      productId: product.id,
      productName: product.name,
      imageUrl: product.imageUrl,
      unitPrice,
      quantity: selection.quantity,
      notes: selection.notes,
      modifierOptionIds: selection.modifierOptionIds,
      modifiersLabel: chosen.map((o) => o.name).join(", "),
      lineTotal: unitPrice * selection.quantity,
    },
  ];
}
