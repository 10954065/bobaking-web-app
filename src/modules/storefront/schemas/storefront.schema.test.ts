import { describe, it, expect } from "vitest";
import { placeStorefrontOrderSchema } from "./storefront.schema";

const BASE_INPUT = {
  branchId: "11111111-1111-4111-8111-111111111111",
  guest: { firstName: "Ama", lastName: "Boateng" },
  items: [{ productId: "22222222-2222-4222-8222-222222222222", quantity: 1, modifierOptionIds: [] }],
};

describe("placeStorefrontOrderSchema", () => {
  it("accepts a PICKUP order with no delivery address", () => {
    const result = placeStorefrontOrderSchema.safeParse({ ...BASE_INPUT, type: "PICKUP" });
    expect(result.success).toBe(true);
  });

  it("rejects a DELIVERY order with no delivery address", () => {
    const result = placeStorefrontOrderSchema.safeParse({ ...BASE_INPUT, type: "DELIVERY" });
    expect(result.success).toBe(false);
  });

  it("accepts a DELIVERY order once an address is provided", () => {
    const result = placeStorefrontOrderSchema.safeParse({
      ...BASE_INPUT,
      type: "DELIVERY",
      deliveryAddress: { addressLine1: "12 Lagos Ave", area: "East Legon" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty cart", () => {
    const result = placeStorefrontOrderSchema.safeParse({ ...BASE_INPUT, type: "PICKUP", items: [] });
    expect(result.success).toBe(false);
  });
});
