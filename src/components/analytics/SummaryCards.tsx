import type { SalesSummary } from "@/modules/analytics/services/sales-analytics.service";

function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-xs font-medium text-stone-400 dark:text-stone-500">n/a vs prior period</span>;
  }
  const isPositive = pct >= 0;
  return (
    <span
      className={`text-xs font-medium ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
    >
      {isPositive ? "+" : ""}
      {pct}% vs prior period
    </span>
  );
}

export function SummaryCards({ summary }: { summary: SalesSummary }) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Revenue</p>
        <p className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-50">GHS {summary.revenue.toFixed(2)}</p>
        <div className="mt-1">
          <ChangeBadge pct={summary.revenueChangePct} />
        </div>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Orders</p>
        <p className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-50">{summary.orderCount}</p>
        <div className="mt-1">
          <ChangeBadge pct={summary.orderChangePct} />
        </div>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Average order value</p>
        <p className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-50">GHS {summary.avgOrderValue.toFixed(2)}</p>
      </div>
    </div>
  );
}
