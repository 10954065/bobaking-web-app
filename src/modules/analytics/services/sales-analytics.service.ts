import { prisma } from "@/db/client";
import type { OrderStatus, OrderType } from "@prisma/client";
import { type AnalyticsFilter, type BranchFilter, EXCLUDED_REVENUE_STATUSES, round2 } from "./filters";

function branchWhere(branchIds: BranchFilter) {
  return branchIds === "ALL" ? undefined : { in: branchIds };
}

/** null = no baseline to compare against (previous period had zero), shown as "n/a" in the UI. */
function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export interface SalesSummary {
  revenue: number;
  orderCount: number;
  avgOrderValue: number;
  revenueChangePct: number | null;
  orderChangePct: number | null;
}

/** Compares the filter's period against an immediately-preceding period of equal length. */
export async function getSalesSummary(filter: AnalyticsFilter): Promise<SalesSummary> {
  const periodMs = filter.to.getTime() - filter.from.getTime();
  const previousFrom = new Date(filter.from.getTime() - periodMs);

  const [current, previous] = await Promise.all([
    prisma.order.findMany({
      where: {
        branchId: branchWhere(filter.branchIds),
        createdAt: { gte: filter.from, lt: filter.to },
        status: { notIn: EXCLUDED_REVENUE_STATUSES },
      },
      select: { total: true },
    }),
    prisma.order.findMany({
      where: {
        branchId: branchWhere(filter.branchIds),
        createdAt: { gte: previousFrom, lt: filter.from },
        status: { notIn: EXCLUDED_REVENUE_STATUSES },
      },
      select: { total: true },
    }),
  ]);

  const revenue = current.reduce((sum, o) => sum + Number(o.total), 0);
  const previousRevenue = previous.reduce((sum, o) => sum + Number(o.total), 0);

  return {
    revenue: round2(revenue),
    orderCount: current.length,
    avgOrderValue: current.length ? round2(revenue / current.length) : 0,
    revenueChangePct: percentChange(revenue, previousRevenue),
    orderChangePct: percentChange(current.length, previous.length),
  };
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

export async function getRevenueTimeSeries(filter: AnalyticsFilter): Promise<RevenuePoint[]> {
  const orders = await prisma.order.findMany({
    where: {
      branchId: branchWhere(filter.branchIds),
      createdAt: { gte: filter.from, lt: filter.to },
      status: { notIn: EXCLUDED_REVENUE_STATUSES },
    },
    select: { total: true, createdAt: true },
  });

  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (const order of orders) {
    const key = order.createdAt.toISOString().slice(0, 10);
    const entry = byDay.get(key) ?? { revenue: 0, orders: 0 };
    entry.revenue += Number(order.total);
    entry.orders += 1;
    byDay.set(key, entry);
  }

  const points: RevenuePoint[] = [];
  const cursor = new Date(filter.from);
  while (cursor < filter.to) {
    const key = cursor.toISOString().slice(0, 10);
    const entry = byDay.get(key) ?? { revenue: 0, orders: 0 };
    points.push({ date: key, revenue: round2(entry.revenue), orders: entry.orders });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return points;
}

export interface TopProduct {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export async function getTopProducts(filter: AnalyticsFilter, limit = 10): Promise<TopProduct[]> {
  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        branchId: branchWhere(filter.branchIds),
        createdAt: { gte: filter.from, lt: filter.to },
        status: { notIn: EXCLUDED_REVENUE_STATUSES },
      },
    },
    select: { productId: true, productName: true, quantity: true, lineSubtotal: true },
  });

  const byProduct = new Map<string, TopProduct>();
  for (const item of items) {
    const existing = byProduct.get(item.productId) ?? {
      productId: item.productId,
      productName: item.productName,
      quantitySold: 0,
      revenue: 0,
    };
    existing.quantitySold += item.quantity;
    existing.revenue += Number(item.lineSubtotal);
    byProduct.set(item.productId, existing);
  }

  return [...byProduct.values()]
    .map((p) => ({ ...p, revenue: round2(p.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export interface StatusBreakdownRow {
  status: OrderStatus;
  count: number;
}

/** Unlike the other queries here, this intentionally does NOT exclude any status —
 * showing the real distribution (including cancellations/failures) is the point. */
export async function getOrderStatusBreakdown(filter: AnalyticsFilter): Promise<StatusBreakdownRow[]> {
  const grouped = await prisma.order.groupBy({
    by: ["status"],
    where: {
      branchId: branchWhere(filter.branchIds),
      createdAt: { gte: filter.from, lt: filter.to },
    },
    _count: { _all: true },
  });
  return grouped.map((g) => ({ status: g.status, count: g._count._all })).sort((a, b) => b.count - a.count);
}

export interface OrderTypeBreakdownRow {
  type: OrderType;
  count: number;
  revenue: number;
}

export async function getOrderTypeBreakdown(filter: AnalyticsFilter): Promise<OrderTypeBreakdownRow[]> {
  const grouped = await prisma.order.groupBy({
    by: ["type"],
    where: {
      branchId: branchWhere(filter.branchIds),
      createdAt: { gte: filter.from, lt: filter.to },
      status: { notIn: EXCLUDED_REVENUE_STATUSES },
    },
    _count: { _all: true },
    _sum: { total: true },
  });
  return grouped
    .map((g) => ({ type: g.type, count: g._count._all, revenue: round2(Number(g._sum.total ?? 0)) }))
    .sort((a, b) => b.revenue - a.revenue);
}

export interface BranchComparisonRow {
  branchId: string;
  branchName: string;
  orders: number;
  revenue: number;
}

export async function getBranchComparison(filter: AnalyticsFilter): Promise<BranchComparisonRow[]> {
  const grouped = await prisma.order.groupBy({
    by: ["branchId"],
    where: {
      branchId: branchWhere(filter.branchIds),
      createdAt: { gte: filter.from, lt: filter.to },
      status: { notIn: EXCLUDED_REVENUE_STATUSES },
    },
    _count: { _all: true },
    _sum: { total: true },
  });
  if (grouped.length === 0) return [];

  const branches = await prisma.branch.findMany({
    where: { id: { in: grouped.map((g) => g.branchId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(branches.map((b) => [b.id, b.name]));

  return grouped
    .map((g) => ({
      branchId: g.branchId,
      branchName: nameById.get(g.branchId) ?? "Unknown branch",
      orders: g._count._all,
      revenue: round2(Number(g._sum.total ?? 0)),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}
