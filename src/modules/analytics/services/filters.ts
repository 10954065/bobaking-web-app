import type { OrderStatus } from "@prisma/client";

/** Orders in these statuses never represent real, retained revenue — same exclusion
 * logic established in promotion.service.ts's usage counting and the CRM lifetime-spend
 * figure, extended here with REFUNDED (money that left again doesn't count as sales). */
export const EXCLUDED_REVENUE_STATUSES: OrderStatus[] = [
  "DRAFT",
  "CANCELLED",
  "REJECTED",
  "PAYMENT_FAILED",
  "REFUNDED",
];

export type BranchFilter = "ALL" | string[];

export interface AnalyticsFilter {
  branchIds: BranchFilter;
  from: Date;
  to: Date;
}

export interface DateRangeSelection {
  from: Date;
  to: Date;
  days: number;
  rangeParam: "7" | "30" | "90";
}

const VALID_RANGE_DAYS = { "7": 7, "30": 30, "90": 90 } as const;

/**
 * Africa/Accra has no DST and sits at UTC+0, so a UTC calendar day IS the branch's
 * local business day — no timezone conversion needed. `to` is the start of tomorrow
 * (exclusive upper bound) so "last N days" always includes all of today so far.
 */
export function resolveDateRange(rangeParam: string | null | undefined): DateRangeSelection {
  const key = rangeParam === "7" || rangeParam === "90" ? rangeParam : "30";
  const days = VALID_RANGE_DAYS[key];
  const now = new Date();
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to, days, rangeParam: key };
}

/**
 * Combines the viewer's accessible branches with an optional single-branch filter
 * from the query string. An out-of-scope branch param is ignored (falls back to the
 * full accessible set) rather than erroring — a stale/tampered link should degrade
 * gracefully, not break the page.
 */
export function resolveBranchFilter(accessibleBranchIds: BranchFilter, branchParam: string | null | undefined): BranchFilter {
  if (accessibleBranchIds === "ALL") {
    return branchParam ? [branchParam] : "ALL";
  }
  if (branchParam && accessibleBranchIds.includes(branchParam)) {
    return [branchParam];
  }
  return accessibleBranchIds;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
