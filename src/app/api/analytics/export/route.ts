import type { NextRequest } from "next/server";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, getAccessibleBranchIds } from "@/modules/auth/services/authorization.service";
import { resolveBranchFilter, resolveDateRange } from "@/modules/analytics/services/filters";
import { getBranchComparison, getOrderTypeBreakdown, getSalesSummary, getTopProducts } from "@/modules/analytics/services/sales-analytics.service";

export const dynamic = "force-dynamic";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "analytics", "export")) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const accessibleBranchIds = getAccessibleBranchIds(profile, "analytics", "read");
  const branchIds = resolveBranchFilter(accessibleBranchIds, url.searchParams.get("branch"));
  const { from, to, rangeParam } = resolveDateRange(url.searchParams.get("range"));
  const filter = { branchIds, from, to };

  const [summary, topProducts, typeBreakdown, branchComparison] = await Promise.all([
    getSalesSummary(filter),
    getTopProducts(filter, 20),
    getOrderTypeBreakdown(filter),
    getBranchComparison(filter),
  ]);

  const lines: string[] = [];
  lines.push(`Flicks & Licks analytics export, last ${rangeParam} days (${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)})`);
  lines.push("");
  lines.push("Summary");
  lines.push("Metric,Value");
  lines.push(`Revenue (GHS),${summary.revenue.toFixed(2)}`);
  lines.push(`Orders,${summary.orderCount}`);
  lines.push(`Average order value (GHS),${summary.avgOrderValue.toFixed(2)}`);
  lines.push("");
  lines.push("Top products");
  lines.push("Product,Quantity sold,Revenue (GHS)");
  for (const p of topProducts) lines.push(`${csvEscape(p.productName)},${p.quantitySold},${p.revenue.toFixed(2)}`);
  lines.push("");
  lines.push("Order type breakdown");
  lines.push("Type,Orders,Revenue (GHS)");
  for (const t of typeBreakdown) lines.push(`${t.type},${t.count},${t.revenue.toFixed(2)}`);
  if (branchComparison.length > 0) {
    lines.push("");
    lines.push("Branch comparison");
    lines.push("Branch,Orders,Revenue (GHS)");
    for (const b of branchComparison) lines.push(`${csvEscape(b.branchName)},${b.orders},${b.revenue.toFixed(2)}`);
  }

  const csv = lines.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="flicks-and-licks-analytics-${rangeParam}d.csv"`,
    },
  });
}
