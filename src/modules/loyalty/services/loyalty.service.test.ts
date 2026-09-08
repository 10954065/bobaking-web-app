import { describe, it, expect, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { evaluatePointsRedemption, PointsRedemptionError } from "./loyalty.service";

const CUSTOMER = "customer-1";

interface FakeConfig {
  isActive: boolean;
  minPointsToRedeem: number;
  redemptionValue: number;
}

function fakeClient(config: FakeConfig, accountBalance: number | null) {
  return {
    loyaltyProgramConfig: { upsert: vi.fn().mockResolvedValue(config) },
    loyaltyAccount: {
      findUnique: vi.fn().mockResolvedValue(accountBalance === null ? null : { pointsBalance: accountBalance }),
    },
  } as unknown as Prisma.TransactionClient;
}

describe("evaluatePointsRedemption", () => {
  it("returns zero discount without touching the DB when points <= 0", async () => {
    const client = fakeClient({ isActive: true, minPointsToRedeem: 1, redemptionValue: 0.5 }, 100);
    const result = await evaluatePointsRedemption(client, { customerId: CUSTOMER, points: 0 });
    expect(result.discountAmount).toBe(0);
    expect(client.loyaltyProgramConfig.upsert).not.toHaveBeenCalled();
  });

  it("throws when the loyalty program is disabled", async () => {
    const client = fakeClient({ isActive: false, minPointsToRedeem: 1, redemptionValue: 0.5 }, 100);
    await expect(evaluatePointsRedemption(client, { customerId: CUSTOMER, points: 10 })).rejects.toThrow(
      PointsRedemptionError
    );
  });

  it("throws when redeeming below the configured minimum", async () => {
    const client = fakeClient({ isActive: true, minPointsToRedeem: 20, redemptionValue: 0.5 }, 100);
    await expect(evaluatePointsRedemption(client, { customerId: CUSTOMER, points: 10 })).rejects.toThrow(
      PointsRedemptionError
    );
  });

  it("throws when the customer doesn't have enough points", async () => {
    const client = fakeClient({ isActive: true, minPointsToRedeem: 1, redemptionValue: 0.5 }, 5);
    await expect(evaluatePointsRedemption(client, { customerId: CUSTOMER, points: 10 })).rejects.toThrow(
      PointsRedemptionError
    );
  });

  it("treats a customer with no loyalty account yet as having a zero balance", async () => {
    const client = fakeClient({ isActive: true, minPointsToRedeem: 1, redemptionValue: 0.5 }, null);
    await expect(evaluatePointsRedemption(client, { customerId: CUSTOMER, points: 10 })).rejects.toThrow(
      PointsRedemptionError
    );
  });

  it("computes the GHS value of a valid redemption", async () => {
    const client = fakeClient({ isActive: true, minPointsToRedeem: 1, redemptionValue: 0.5 }, 100);
    const result = await evaluatePointsRedemption(client, { customerId: CUSTOMER, points: 20 });
    expect(result.discountAmount).toBe(10);
  });

  it("allows redeeming exactly the customer's full balance", async () => {
    const client = fakeClient({ isActive: true, minPointsToRedeem: 1, redemptionValue: 0.1 }, 50);
    const result = await evaluatePointsRedemption(client, { customerId: CUSTOMER, points: 50 });
    expect(result.discountAmount).toBe(5);
  });
});
