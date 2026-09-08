import type { NextRequest } from "next/server";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, getAccessibleBranchIds } from "@/modules/auth/services/authorization.service";
import { resolveDateRange } from "@/modules/analytics/services/filters";
import { getSupportTicketsReport } from "@/modules/reports/services/reports.service";

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
  if (!hasAnyPermission(profile, "support", "read")) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const branchIds = getAccessibleBranchIds(profile, "support", "read");
  const { from, to, rangeParam } = resolveDateRange(url.searchParams.get("range"));
  const report = await getSupportTicketsReport(branchIds, { from, to });

  const lines: string[] = [];
  lines.push(`Flicks & Licks support tickets — last ${rangeParam} days (${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)})`);
  lines.push("");
  lines.push("By status");
  lines.push("Status,Count");
  for (const s of report.byStatus) lines.push(`${s.status},${s.count}`);
  lines.push("");
  lines.push("Tickets");
  lines.push("Subject,Customer,Branch,Status,Created");
  for (const t of report.tickets) {
    lines.push(`${csvEscape(t.subject)},${csvEscape(t.customerName)},${csvEscape(t.branchName)},${t.status},${t.createdAt.toISOString()}`);
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="flicks-and-licks-support-tickets-${rangeParam}d.csv"`,
    },
  });
}
