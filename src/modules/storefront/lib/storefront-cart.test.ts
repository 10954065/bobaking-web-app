import { describe, it, expect } from "vitest";
import { addSelectionToCart } from "./storefront-cart";
import type { PosProduct } from "@/modules/pos/services/pos-catalog.service";

const PRODUCT: PosProduct = {
  id: "product-1",
  categoryId: "cat-1",
  name: "Loaded Fries",
  price: 45,
  isAvailable: true,
  imageUrl: null,
  modifierGroups: [
    {
      id: "group-1",
      name: "Spice Level",
      selectionType: "SINGLE",
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      options: [
        { id: "opt-mild", name: "Mild", priceDelta: 0 },
        { id: "opt-hot", name: "Hot", priceDelta: 0 },
      ],
    },
    {
      id: "group-2",
      name: "Extras",
      selectionType: "MULTIPLE",
      isRequired: false,
      minSelect: 0,
      maxSelect: null,
      options: [{ id: "opt-cheese", name: "Extra Cheese", priceDelta: 10 }],
    },
  ],
};

describe("addSelectionToCart", () => {
  it("adds a new line with the modifier price delta folded into unit price", () => {
    const cart = addSelectionToCart([], PRODUCT, {
      productId: PRODUCT.id,
      quantity: 2,
      notes: "",
      modifierOptionIds: ["opt-mild", "opt-cheese"],
    });

    expect(cart).toHaveLength(1);
    expect(cart[0]!.unitPrice).toBe(55);
    expect(cart[0]!.quantity).toBe(2);
    expect(cart[0]!.lineTotal).toBe(110);
    expect(cart[0]!.modifiersLabel).toBe("Mild, Extra Cheese");
  });

  it("merges quantity into the existing line for an identical product+modifiers+notes selection", () => {
    const firstPass = addSelectionToCart([], PRODUCT, {
      productId: PRODUCT.id,
      quantity: 1,
      notes: "no ketchup",
      modifierOptionIds: ["opt-hot"],
    });
    const secondPass = addSelectionToCart(firstPass, PRODUCT, {
      productId: PRODUCT.id,
      quantity: 3,
      notes: "no ketchup",
      modifierOptionIds: ["opt-hot"],
    });

    expect(secondPass).toHaveLength(1);
    expect(secondPass[0]!.quantity).toBe(4);
    expect(secondPass[0]!.lineTotal).toBe(secondPass[0]!.unitPrice * 4);
  });

  it("keeps two selections as separate lines when their notes differ", () => {
    const firstPass = addSelectionToCart([], PRODUCT, {
      productId: PRODUCT.id,
      quantity: 1,
      notes: "extra spicy please",
      modifierOptionIds: ["opt-hot"],
    });
    const secondPass = addSelectionToCart(firstPass, PRODUCT, {
      productId: PRODUCT.id,
      quantity: 1,
      notes: "",
      modifierOptionIds: ["opt-hot"],
    });

    expect(secondPass).toHaveLength(2);
  });
});
