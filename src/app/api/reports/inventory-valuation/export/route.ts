import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, getAccessibleBranchIds } from "@/modules/auth/services/authorization.service";
import { getInventoryValuationReport } from "@/modules/reports/services/reports.service";

export const dynamic = "force-dynamic";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "inventory", "read")) {
    return new Response("Forbidden", { status: 403 });
  }

  const branchIds = getAccessibleBranchIds(profile, "inventory", "read");
  const rows = await getInventoryValuationReport(branchIds);
  const totalValuation = rows.reduce((sum, r) => sum + r.valuation, 0);

  const lines: string[] = [];
  lines.push(`Flicks & Licks inventory valuation — as of ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`Total valuation (GHS),${totalValuation.toFixed(2)}`);
  lines.push("");
  lines.push("Branch,Ingredient,Unit,Quantity on hand,Unit cost (GHS),Valuation (GHS),Below reorder level");
  for (const row of rows) {
    lines.push(
      `${csvEscape(row.branchName)},${csvEscape(row.ingredientName)},${row.unit},${row.quantityOnHand},${row.unitCost != null ? row.unitCost.toFixed(2) : ""},${row.valuation.toFixed(2)},${row.belowReorder ? "Yes" : "No"}`
    );
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="flicks-and-licks-inventory-valuation.csv"',
    },
  });
}
