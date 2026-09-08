import type { NextRequest } from "next/server";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, getAccessibleBranchIds } from "@/modules/auth/services/authorization.service";
import { resolveDateRange } from "@/modules/analytics/services/filters";
import { getReviewsReport } from "@/modules/reports/services/reports.service";

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
  if (!hasAnyPermission(profile, "reviews", "read")) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const branchIds = getAccessibleBranchIds(profile, "reviews", "read");
  const { from, to, rangeParam } = resolveDateRange(url.searchParams.get("range"));
  const report = await getReviewsReport(branchIds, { from, to });

  const lines: string[] = [];
  lines.push(`Flicks & Licks reviews — last ${rangeParam} days (${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)})`);
  lines.push(`Average rating,${report.avgRating ?? ""}`);
  lines.push("");
  lines.push("Rating distribution");
  lines.push("Rating,Count");
  for (const rating of [5, 4, 3, 2, 1] as const) lines.push(`${rating},${report.countByRating[rating]}`);
  lines.push("");
  lines.push("Reviews");
  lines.push("Rating,Comment,Customer,Branch,Status,Created");
  for (const r of report.reviews) {
    lines.push(
      `${r.rating},${csvEscape(r.comment ?? "")},${csvEscape(r.customerName)},${csvEscape(r.branchName)},${r.status},${r.createdAt.toISOString()}`
    );
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="flicks-and-licks-reviews-${rangeParam}d.csv"`,
    },
  });
}
