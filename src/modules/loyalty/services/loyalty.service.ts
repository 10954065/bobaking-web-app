import { prisma } from "@/db/client";
import type { Prisma, LoyaltyTransactionType } from "@prisma/client";
import { recordAuditLog } from "@/modules/audit/services/audit.service";
import {
  updateLoyaltyConfigSchema,
  adjustLoyaltyPointsSchema,
  type UpdateLoyaltyConfigInput,
  type AdjustLoyaltyPointsInput,
} from "@/modules/loyalty/schemas/loyalty.schema";

export class LoyaltyError extends Error {}

export class PointsRedemptionError extends LoyaltyError {
  constructor(message: string) {
    super(message);
    this.name = "PointsRedemptionError";
  }
}

type DbClient = Prisma.TransactionClient | typeof prisma;

const CONFIG_ID = "default";

/** Singleton config row, upserted rather than seeded once and assumed present — same reasoning as Branch.taxRate: a configurable business constant, never hard-coded into the earn/redeem math below. */
export async function getLoyaltyConfig(client: DbClient = prisma) {
  return client.loyaltyProgramConfig.upsert({
    where: { id: CONFIG_ID },
    update: {},
    create: { id: CONFIG_ID },
  });
}

export async function updateLoyaltyConfig(input: UpdateLoyaltyConfigInput) {
  const data = updateLoyaltyConfigSchema.parse(input);
  return prisma.loyaltyProgramConfig.upsert({
    where: { id: CONFIG_ID },
    update: data,
    create: { id: CONFIG_ID, ...data },
  });
}

/**
 * The single write path for loyalty point changes — keeps LoyaltyAccount's
 * cached pointsBalance in lockstep with the LoyaltyTransaction ledger inside
 * one call, the same recordStockMovement pattern as
 * BranchIngredientStock/StockMovement (Phase 5). Never mutate LoyaltyAccount
 * directly anywhere else. `points` is signed: positive credits the account,
 * negative debits it — callers are responsible for validating a debit
 * against the current balance first (see evaluatePointsRedemption).
 */
export async function recordLoyaltyTransaction(
  client: DbClient,
  params: {
    customerId: string;
    orderId?: string | null;
    type: LoyaltyTransactionType;
    points: number;
    reason?: string | null;
    actorUserId?: string | null;
  }
) {
  const account = await client.loyaltyAccount.upsert({
    where: { customerId: params.customerId },
    create: {
      customerId: params.customerId,
      pointsBalance: params.points,
      lifetimePointsEarned: params.points > 0 ? params.points : 0,
    },
    update: {
      pointsBalance: { increment: params.points },
      ...(params.points > 0 ? { lifetimePointsEarned: { increment: params.points } } : {}),
    },
  });

  const transaction = await client.loyaltyTransaction.create({
    data: {
      customerId: params.customerId,
      orderId: params.orderId ?? null,
      type: params.type,
      points: params.points,
      balanceAfter: account.pointsBalance,
      reason: params.reason ?? null,
      actorUserId: params.actorUserId ?? null,
    },
  });

  return { account, transaction };
}

/**
 * Validates a points redemption and returns the GHS value it's worth,
 * without committing anything — checkout.service.ts calls this, then
 * commits via recordLoyaltyTransaction inside the same transaction so the
 * order and the point debit succeed or fail together. Takes an explicit
 * client for the same reason evaluatePromotionCode does.
 */
export async function evaluatePointsRedemption(
  client: DbClient,
  params: { customerId: string; points: number }
): Promise<{ discountAmount: number }> {
  if (params.points <= 0) return { discountAmount: 0 };

  const config = await getLoyaltyConfig(client);
  if (!config.isActive) {
    throw new PointsRedemptionError("Loyalty point redemption is currently disabled.");
  }
  if (params.points < config.minPointsToRedeem) {
    throw new PointsRedemptionError(`Minimum redemption is ${config.minPointsToRedeem} points.`);
  }

  const account = await client.loyaltyAccount.findUnique({ where: { customerId: params.customerId } });
  const balance = account?.pointsBalance ?? 0;
  if (balance < params.points) {
    throw new PointsRedemptionError(`Not enough points — this customer has ${balance}.`);
  }

  const discountAmount = Math.round(params.points * Number(config.redemptionValue) * 100) / 100;
  return { discountAmount };
}

/**
 * Awards points for a successful payment. Called from payment.service.ts
 * after a Payment transitions to SUCCEEDED — guarded against double-award
 * by checking for an existing EARNED transaction on this order first, since
 * a payment's own idempotency guards (Payment.status, PaymentWebhookEvent's
 * unique constraint) mean this should only ever be called once per order,
 * but a second call must still be a safe no-op rather than double-crediting.
 */
export async function awardPointsForOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });

  const alreadyAwarded = await prisma.loyaltyTransaction.findFirst({ where: { orderId, type: "EARNED" } });
  if (alreadyAwarded) return;

  const config = await getLoyaltyConfig();
  if (!config.isActive) return;

  const points = Math.floor(Number(order.total) * Number(config.pointsPerCurrency));
  if (points <= 0) return;

  await prisma.$transaction((tx) =>
    recordLoyaltyTransaction(tx, {
      customerId: order.customerId,
      orderId: order.id,
      type: "EARNED",
      points,
      reason: `Earned from order ${order.orderNumber}`,
    })
  );
}

/**
 * Best-effort wrapper for payment.service.ts's two success paths (cash
 * confirmation, webhook). A loyalty bug must never roll back a real payment
 * that already succeeded — but a failure here still isn't silently
 * swallowed: it's captured as an audit log entry so it stays visible instead
 * of vanishing.
 */
export async function awardPointsForOrderSafely(orderId: string): Promise<void> {
  try {
    await awardPointsForOrder(orderId);
  } catch (error) {
    await recordAuditLog({
      actorUserId: null,
      action: "loyalty.award_failed",
      resourceType: "Order",
      resourceId: orderId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    });
  }
}

export async function adjustLoyaltyPoints(customerId: string, input: AdjustLoyaltyPointsInput, actorUserId: string) {
  const data = adjustLoyaltyPointsSchema.parse(input);
  return recordLoyaltyTransaction(prisma, {
    customerId,
    type: "ADJUSTED",
    points: data.points,
    reason: data.reason,
    actorUserId,
  });
}

export async function getLoyaltyAccountForCustomer(customerId: string) {
  return prisma.loyaltyAccount.findUnique({ where: { customerId } });
}

export async function listLoyaltyTransactionsForCustomer(customerId: string, limit = 20) {
  return prisma.loyaltyTransaction.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
