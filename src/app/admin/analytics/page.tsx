import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, getAccessibleBranchIds } from "@/modules/auth/services/authorization.service";
import { listBranches } from "@/modules/branches/services/branch.service";
import { resolveBranchFilter, resolveDateRange } from "@/modules/analytics/services/filters";
import {
  getBranchComparison,
  getOrderStatusBreakdown,
  getOrderTypeBreakdown,
  getRevenueTimeSeries,
  getSalesSummary,
  getTopProducts,
} from "@/modules/analytics/services/sales-analytics.service";
import { getCustomerInsights, getDeliveryPerformance, getGeographicBreakdown } from "@/modules/analytics/services/geo-analytics.service";
import { SummaryCards } from "@/components/analytics/SummaryCards";
import { RevenueChart } from "@/components/analytics/RevenueChart";
import { TopProductsTable } from "@/components/analytics/TopProductsTable";
import { OrderBreakdownSection } from "@/components/analytics/OrderBreakdownSection";
import { BranchComparisonTable } from "@/components/analytics/BranchComparisonTable";
import { GeographicSection } from "@/components/analytics/GeographicSection";
import { CustomerInsightsSection } from "@/components/analytics/CustomerInsightsSection";

const RANGE_PRESETS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; range?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "analytics", "read")) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view analytics.</p>
        </main>
      </div>
    );
  }

  const { branch: branchParam, range: rangeParam } = await searchParams;
  const canExport = hasAnyPermission(profile, "analytics", "export");
  const accessibleBranchIds = getAccessibleBranchIds(profile, "analytics", "read");
  const branches = await listBranches(accessibleBranchIds === "ALL" ? {} : { branchIds: accessibleBranchIds });

  const branchIds = resolveBranchFilter(accessibleBranchIds, branchParam);
  const { from, to, rangeParam: activeRange } = resolveDateRange(rangeParam);
  const filter = { branchIds, from, to };
  const showBranchComparison = branchIds === "ALL" || branchIds.length > 1;

  const [summary, revenueSeries, topProducts, statusBreakdown, typeBreakdown, branchComparison, geoRows, deliveryPerformance, customerInsights] =
    await Promise.all([
      getSalesSummary(filter),
      getRevenueTimeSeries(filter),
      getTopProducts(filter),
      getOrderStatusBreakdown(filter),
      getOrderTypeBreakdown(filter),
      showBranchComparison ? getBranchComparison(filter) : Promise.resolve([]),
      getGeographicBreakdown(filter),
      getDeliveryPerformance(filter),
      getCustomerInsights(filter),
    ]);

  const exportHref = `/api/analytics/export?range=${activeRange}${branchParam ? `&branch=${branchParam}` : ""}`;

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Analytics</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">Sales, product, geographic, and customer performance.</p>
          </div>
          {canExport && (
            <a
              href={exportHref}
              className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Export CSV
            </a>
          )}
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex gap-1">
            {RANGE_PRESETS.map((preset) => (
              <Link
                key={preset.value}
                href={`/admin/analytics?range=${preset.value}${branchParam ? `&branch=${branchParam}` : ""}`}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  preset.value === activeRange
                    ? "bg-brand-red-600 text-white"
                    : "bg-white text-stone-600 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800"
                }`}
              >
                {preset.label}
              </Link>
            ))}
          </div>
          {branches.length > 1 && (
            <div className="flex flex-wrap gap-1">
              <Link
                href={`/admin/analytics?range=${activeRange}`}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  !branchParam
                    ? "bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900"
                    : "bg-white text-stone-600 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800"
                }`}
              >
                All branches
              </Link>
              {branches.map((branch) => (
                <Link
                  key={branch.id}
                  href={`/admin/analytics?range=${activeRange}&branch=${branch.id}`}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    branchParam === branch.id
                      ? "bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900"
                      : "bg-white text-stone-600 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800"
                  }`}
                >
                  {branch.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <SummaryCards summary={summary} />
        <RevenueChart points={revenueSeries} />
        <TopProductsTable products={topProducts} />
        <OrderBreakdownSection statusBreakdown={statusBreakdown} typeBreakdown={typeBreakdown} />
        {showBranchComparison && <BranchComparisonTable rows={branchComparison} />}
        <GeographicSection geoRows={geoRows} deliveryPerformance={deliveryPerformance} />
        <CustomerInsightsSection insights={customerInsights} />
      </main>
    </div>
  );
}
