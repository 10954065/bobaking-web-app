import { describe, it, expect, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { evaluatePromotionCode, InvalidPromotionCodeError, PromotionNotEligibleError } from "./promotion.service";

const BRANCH_A = "branch-a";
const BRANCH_B = "branch-b";
const CUSTOMER = "customer-1";

interface FakePromotion {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minSubtotal: number | null;
  maxDiscountAmount: number | null;
  branchId: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usageLimitPerCustomer: number | null;
}

function basePromotion(overrides: Partial<FakePromotion> = {}): FakePromotion {
  return {
    id: "promo-1",
    code: "TESTCODE",
    name: "Test Promo",
    isActive: true,
    discountType: "PERCENTAGE",
    discountValue: 10,
    minSubtotal: null,
    maxDiscountAmount: null,
    branchId: null,
    startsAt: null,
    endsAt: null,
    usageLimit: null,
    usageLimitPerCustomer: null,
    ...overrides,
  };
}

/** A fake Prisma client exposing only the two calls evaluatePromotionCode makes. */
function fakeClient(promotion: FakePromotion | null, orderCount = 0) {
  return {
    promotion: { findUnique: vi.fn().mockResolvedValue(promotion) },
    order: { count: vi.fn().mockResolvedValue(orderCount) },
  } as unknown as Prisma.TransactionClient;
}

describe("evaluatePromotionCode", () => {
  it("throws InvalidPromotionCodeError when the code doesn't exist", async () => {
    const client = fakeClient(null);
    await expect(
      evaluatePromotionCode(client, { code: "NOPE", branchId: BRANCH_A, customerId: CUSTOMER, subtotal: 100 })
    ).rejects.toThrow(InvalidPromotionCodeError);
  });

  it("throws InvalidPromotionCodeError when the code is deactivated", async () => {
    const client = fakeClient(basePromotion({ isActive: false }));
    await expect(
      evaluatePromotionCode(client, { code: "TESTCODE", branchId: BRANCH_A, customerId: CUSTOMER, subtotal: 100 })
    ).rejects.toThrow(InvalidPromotionCodeError);
  });

  it("computes a percentage discount correctly", async () => {
    const client = fakeClient(basePromotion({ discountType: "PERCENTAGE", discountValue: 10 }));
    const result = await evaluatePromotionCode(client, {
      code: "TESTCODE",
      branchId: BRANCH_A,
      customerId: CUSTOMER,
      subtotal: 180,
    });
    expect(result.discountAmount).toBe(18);
  });

  it("computes a fixed-amount discount correctly", async () => {
    const client = fakeClient(basePromotion({ discountType: "FIXED_AMOUNT", discountValue: 5 }));
    const result = await evaluatePromotionCode(client, {
      code: "TESTCODE",
      branchId: BRANCH_A,
      customerId: CUSTOMER,
      subtotal: 100,
    });
    expect(result.discountAmount).toBe(5);
  });

  it("caps a percentage discount at maxDiscountAmount", async () => {
    const client = fakeClient(basePromotion({ discountType: "PERCENTAGE", discountValue: 50, maxDiscountAmount: 20 }));
    const result = await evaluatePromotionCode(client, {
      code: "TESTCODE",
      branchId: BRANCH_A,
      customerId: CUSTOMER,
      subtotal: 200,
    });
    // 50% of 200 = 100, capped at 20
    expect(result.discountAmount).toBe(20);
  });

  it("never discounts more than the order subtotal itself", async () => {
    const client = fakeClient(basePromotion({ discountType: "FIXED_AMOUNT", discountValue: 50 }));
    const result = await evaluatePromotionCode(client, {
      code: "TESTCODE",
      branchId: BRANCH_A,
      customerId: CUSTOMER,
      subtotal: 30,
    });
    expect(result.discountAmount).toBe(30);
  });

  it("rejects a code scoped to a different branch", async () => {
    const client = fakeClient(basePromotion({ branchId: BRANCH_B }));
    await expect(
      evaluatePromotionCode(client, { code: "TESTCODE", branchId: BRANCH_A, customerId: CUSTOMER, subtotal: 100 })
    ).rejects.toThrow(PromotionNotEligibleError);
  });

  it("accepts a branch-scoped code at its own branch", async () => {
    const client = fakeClient(basePromotion({ branchId: BRANCH_A, discountType: "FIXED_AMOUNT", discountValue: 5 }));
    await expect(
      evaluatePromotionCode(client, { code: "TESTCODE", branchId: BRANCH_A, customerId: CUSTOMER, subtotal: 100 })
    ).resolves.toMatchObject({ discountAmount: 5 });
  });

  it("rejects an order below minSubtotal", async () => {
    const client = fakeClient(basePromotion({ minSubtotal: 50 }));
    await expect(
      evaluatePromotionCode(client, { code: "TESTCODE", branchId: BRANCH_A, customerId: CUSTOMER, subtotal: 30 })
    ).rejects.toThrow(PromotionNotEligibleError);
  });

  it("rejects a code that hasn't started yet", async () => {
    const client = fakeClient(basePromotion({ startsAt: new Date(Date.now() + 86_400_000) }));
    await expect(
      evaluatePromotionCode(client, { code: "TESTCODE", branchId: BRANCH_A, customerId: CUSTOMER, subtotal: 100 })
    ).rejects.toThrow(PromotionNotEligibleError);
  });

  it("rejects a code that has already expired", async () => {
    const client = fakeClient(basePromotion({ endsAt: new Date(Date.now() - 86_400_000) }));
    await expect(
      evaluatePromotionCode(client, { code: "TESTCODE", branchId: BRANCH_A, customerId: CUSTOMER, subtotal: 100 })
    ).rejects.toThrow(PromotionNotEligibleError);
  });

  it("rejects once the global usage limit is reached", async () => {
    const client = fakeClient(basePromotion({ usageLimit: 5 }), 5);
    await expect(
      evaluatePromotionCode(client, { code: "TESTCODE", branchId: BRANCH_A, customerId: CUSTOMER, subtotal: 100 })
    ).rejects.toThrow(PromotionNotEligibleError);
  });

  it("rejects once the per-customer usage limit is reached", async () => {
    const client = fakeClient(basePromotion({ usageLimitPerCustomer: 1 }), 1);
    await expect(
      evaluatePromotionCode(client, { code: "TESTCODE", branchId: BRANCH_A, customerId: CUSTOMER, subtotal: 100 })
    ).rejects.toThrow(PromotionNotEligibleError);
  });

  it("normalizes the submitted code to uppercase before looking it up", async () => {
    const client = fakeClient(basePromotion());
    await evaluatePromotionCode(client, { code: "testcode", branchId: BRANCH_A, customerId: CUSTOMER, subtotal: 100 });
    expect(client.promotion.findUnique).toHaveBeenCalledWith({ where: { code: "TESTCODE" } });
  });
});
