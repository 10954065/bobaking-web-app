import { prisma } from "@/db/client";
import { type AnalyticsFilter, type BranchFilter, EXCLUDED_REVENUE_STATUSES, round2 } from "./filters";

function branchWhere(branchIds: BranchFilter) {
  return branchIds === "ALL" ? undefined : { in: branchIds };
}

export interface GeoBreakdownRow {
  label: string;
  orders: number;
  revenue: number;
  deliveryFeeRevenue: number;
}

/**
 * Groups delivery orders by their matched DeliveryZone name — a curated, typo-free
 * label — falling back to the customer's free-text address area (see the schema
 * comment on CustomerAddress) for orders that fell through to the branch's default fee.
 */
export async function getGeographicBreakdown(filter: AnalyticsFilter, limit = 10): Promise<GeoBreakdownRow[]> {
  const orders = await prisma.order.findMany({
    where: {
      branchId: branchWhere(filter.branchIds),
      type: "DELIVERY",
      createdAt: { gte: filter.from, lt: filter.to },
      status: { notIn: EXCLUDED_REVENUE_STATUSES },
    },
    select: {
      total: true,
      deliveryFee: true,
      deliveryZone: { select: { name: true } },
      deliveryAddress: { select: { area: true } },
    },
  });

  const byLabel = new Map<string, GeoBreakdownRow>();
  for (const order of orders) {
    const label = order.deliveryZone?.name ?? order.deliveryAddress?.area?.trim() ?? "Unzoned";
    const existing = byLabel.get(label) ?? { label, orders: 0, revenue: 0, deliveryFeeRevenue: 0 };
    existing.orders += 1;
    existing.revenue += Number(order.total);
    existing.deliveryFeeRevenue += Number(order.deliveryFee);
    byLabel.set(label, existing);
  }

  return [...byLabel.values()]
    .map((r) => ({ ...r, revenue: round2(r.revenue), deliveryFeeRevenue: round2(r.deliveryFeeRevenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export interface DeliveryZonePerformanceRow {
  label: string;
  deliveries: number;
  avgMinutes: number;
  onTimeRate: number | null;
}

export interface DeliveryPerformance {
  overallDeliveries: number;
  overallAvgMinutes: number | null;
  byZone: DeliveryZonePerformanceRow[];
}

/** Delivery duration = time from rider assignment to the DELIVERED status transition. */
export async function getDeliveryPerformance(filter: AnalyticsFilter): Promise<DeliveryPerformance> {
  const orders = await prisma.order.findMany({
    where: {
      branchId: branchWhere(filter.branchIds),
      type: "DELIVERY",
      status: "DELIVERED",
      createdAt: { gte: filter.from, lt: filter.to },
      riderAssignedAt: { not: null },
    },
    select: {
      riderAssignedAt: true,
      deliveryZone: { select: { name: true, estimatedMinutes: true } },
      statusHistory: { where: { toStatus: "DELIVERED" }, select: { createdAt: true }, take: 1 },
    },
  });

  type Accumulator = { deliveries: number; totalMinutes: number; onTime: number; estimatedKnown: number };
  const byZone = new Map<string, Accumulator>();
  let overallDeliveries = 0;
  let overallMinutes = 0;

  for (const order of orders) {
    const deliveredAt = order.statusHistory[0]?.createdAt;
    if (!deliveredAt || !order.riderAssignedAt) continue;
    const minutes = (deliveredAt.getTime() - order.riderAssignedAt.getTime()) / 60_000;
    if (minutes < 0) continue;

    overallDeliveries += 1;
    overallMinutes += minutes;

    const label = order.deliveryZone?.name ?? "Unzoned";
    const row = byZone.get(label) ?? { deliveries: 0, totalMinutes: 0, onTime: 0, estimatedKnown: 0 };
    row.deliveries += 1;
    row.totalMinutes += minutes;
    if (order.deliveryZone?.estimatedMinutes != null) {
      row.estimatedKnown += 1;
      if (minutes <= order.deliveryZone.estimatedMinutes) row.onTime += 1;
    }
    byZone.set(label, row);
  }

  return {
    overallDeliveries,
    overallAvgMinutes: overallDeliveries ? Math.round(overallMinutes / overallDeliveries) : null,
    byZone: [...byZone.entries()]
      .map(([label, row]) => ({
        label,
        deliveries: row.deliveries,
        avgMinutes: Math.round(row.totalMinutes / row.deliveries),
        onTimeRate: row.estimatedKnown ? Math.round((row.onTime / row.estimatedKnown) * 100) : null,
      }))
      .sort((a, b) => b.deliveries - a.deliveries),
  };
}

export interface TopCustomerRow {
  customerId: string;
  name: string;
  orders: number;
  spend: number;
}

export interface CustomerInsights {
  newCustomers: number;
  returningCustomers: number;
  topCustomers: TopCustomerRow[];
}

/**
 * "Returning" means the customer had at least one real order before this period
 * started — not just before their most recent order — so a customer's very first
 * order in this window always counts as "new", regardless of when it lands.
 */
export async function getCustomerInsights(filter: AnalyticsFilter, topLimit = 5): Promise<CustomerInsights> {
  const orders = await prisma.order.findMany({
    where: {
      branchId: branchWhere(filter.branchIds),
      createdAt: { gte: filter.from, lt: filter.to },
      status: { notIn: EXCLUDED_REVENUE_STATUSES },
    },
    select: { customerId: true, total: true, customer: { select: { firstName: true, lastName: true } } },
  });

  if (orders.length === 0) {
    return { newCustomers: 0, returningCustomers: 0, topCustomers: [] };
  }

  const customerIds = [...new Set(orders.map((o) => o.customerId))];
  const priorOrderCustomers = await prisma.order.groupBy({
    by: ["customerId"],
    where: {
      customerId: { in: customerIds },
      createdAt: { lt: filter.from },
      status: { notIn: EXCLUDED_REVENUE_STATUSES },
    },
  });
  const returningIds = new Set(priorOrderCustomers.map((o) => o.customerId));

  const byCustomer = new Map<string, TopCustomerRow>();
  for (const order of orders) {
    const existing = byCustomer.get(order.customerId) ?? {
      customerId: order.customerId,
      name: `${order.customer.firstName} ${order.customer.lastName}`,
      orders: 0,
      spend: 0,
    };
    existing.orders += 1;
    existing.spend += Number(order.total);
    byCustomer.set(order.customerId, existing);
  }

  return {
    newCustomers: customerIds.filter((id) => !returningIds.has(id)).length,
    returningCustomers: returningIds.size,
    topCustomers: [...byCustomer.values()]
      .map((c) => ({ ...c, spend: round2(c.spend) }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, topLimit),
  };
}
