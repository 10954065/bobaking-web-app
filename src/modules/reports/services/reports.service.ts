import { prisma } from "@/db/client";
import type { ReviewStatus, SupportTicketStatus } from "@prisma/client";

type BranchFilter = "ALL" | string[];

function branchWhere(branchIds: BranchFilter) {
  return branchIds === "ALL" ? undefined : { in: branchIds };
}

export interface InventoryValuationRow {
  branchName: string;
  ingredientName: string;
  unit: string;
  quantityOnHand: number;
  unitCost: number | null;
  valuation: number;
  belowReorder: boolean;
}

/**
 * Ingredient.unit itself carries no cost — the closest thing to a "current
 * cost" is the unit cost from the most recently updated purchase order that
 * actually received some of it. Ingredients never yet received show unitCost
 * = null (valuation 0) rather than a fabricated number.
 */
export async function getInventoryValuationReport(branchIds: BranchFilter): Promise<InventoryValuationRow[]> {
  const stocks = await prisma.branchIngredientStock.findMany({
    where: { branchId: branchWhere(branchIds) },
    include: { branch: true, ingredient: true },
  });
  if (stocks.length === 0) return [];

  const ingredientIds = [...new Set(stocks.map((s) => s.ingredientId))];
  const recentItems = await prisma.purchaseOrderItem.findMany({
    where: { ingredientId: { in: ingredientIds }, quantityReceived: { gt: 0 } },
    include: { purchaseOrder: { select: { updatedAt: true } } },
    orderBy: { purchaseOrder: { updatedAt: "desc" } },
  });
  const latestCostByIngredient = new Map<string, number>();
  for (const item of recentItems) {
    if (!latestCostByIngredient.has(item.ingredientId)) {
      latestCostByIngredient.set(item.ingredientId, Number(item.unitCost));
    }
  }

  return stocks
    .map((stock) => {
      const quantityOnHand = Number(stock.quantityOnHand);
      const unitCost = latestCostByIngredient.get(stock.ingredientId) ?? null;
      const reorderLevel = Number(stock.reorderLevel ?? stock.ingredient.reorderLevel);
      return {
        branchName: stock.branch.name,
        ingredientName: stock.ingredient.name,
        unit: stock.ingredient.unit,
        quantityOnHand,
        unitCost,
        valuation: unitCost != null ? Math.round(quantityOnHand * unitCost * 100) / 100 : 0,
        belowReorder: quantityOnHand < reorderLevel,
      };
    })
    .sort((a, b) => b.valuation - a.valuation);
}

export interface SupportTicketsReport {
  byStatus: { status: SupportTicketStatus; count: number }[];
  tickets: {
    id: string;
    subject: string;
    status: SupportTicketStatus;
    branchName: string;
    customerName: string;
    createdAt: Date;
  }[];
}

export async function getSupportTicketsReport(
  branchIds: BranchFilter,
  filter: { from: Date; to: Date }
): Promise<SupportTicketsReport> {
  const tickets = await prisma.supportTicket.findMany({
    where: { branchId: branchWhere(branchIds), createdAt: { gte: filter.from, lt: filter.to } },
    include: { branch: true, customer: true },
    orderBy: { createdAt: "desc" },
  });

  const byStatus = new Map<SupportTicketStatus, number>();
  for (const ticket of tickets) byStatus.set(ticket.status, (byStatus.get(ticket.status) ?? 0) + 1);

  return {
    byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
    tickets: tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      branchName: t.branch?.name ?? "N/A",
      customerName: `${t.customer.firstName} ${t.customer.lastName}`,
      createdAt: t.createdAt,
    })),
  };
}

export interface ReviewsReport {
  avgRating: number | null;
  countByRating: Record<1 | 2 | 3 | 4 | 5, number>;
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    status: ReviewStatus;
    branchName: string;
    customerName: string;
    createdAt: Date;
  }[];
}

export async function getReviewsReport(branchIds: BranchFilter, filter: { from: Date; to: Date }): Promise<ReviewsReport> {
  const reviews = await prisma.review.findMany({
    where: { branchId: branchWhere(branchIds), createdAt: { gte: filter.from, lt: filter.to } },
    include: { branch: true, customer: true },
    orderBy: { createdAt: "desc" },
  });

  const countByRating: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;
  for (const review of reviews) {
    countByRating[review.rating as 1 | 2 | 3 | 4 | 5] += 1;
    ratingSum += review.rating;
  }

  return {
    avgRating: reviews.length ? Math.round((ratingSum / reviews.length) * 10) / 10 : null,
    countByRating,
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      status: r.status,
      branchName: r.branch.name,
      customerName: `${r.customer.firstName} ${r.customer.lastName}`,
      createdAt: r.createdAt,
    })),
  };
}
