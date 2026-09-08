import Link from "next/link";
import type { CustomerInsights } from "@/modules/analytics/services/geo-analytics.service";

export function CustomerInsightsSection({ insights }: { insights: CustomerInsights }) {
  const total = insights.newCustomers + insights.returningCustomers || 1;
  const newPct = Math.round((insights.newCustomers / total) * 100);

  return (
    <section className="mb-8 rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
      <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">Customers</h3>

      <div className="mt-4 flex items-center gap-6">
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">New</p>
          <p className="text-xl font-bold text-stone-900 dark:text-stone-50">{insights.newCustomers}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Returning</p>
          <p className="text-xl font-bold text-stone-900 dark:text-stone-50">{insights.returningCustomers}</p>
        </div>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
          <div className="h-2 bg-brand-red-500 dark:bg-brand-red-600" style={{ width: `${newPct}%` }} />
        </div>
      </div>

      <h4 className="mt-6 text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Top customers by spend</h4>
      <ul className="mt-3 divide-y divide-stone-100 dark:divide-stone-800">
        {insights.topCustomers.map((customer) => (
          <li key={customer.customerId} className="flex items-center justify-between py-2 text-sm">
            <Link
              href={`/admin/customers/${customer.customerId}`}
              className="font-medium text-stone-900 hover:text-brand-red-600 dark:text-stone-50 dark:hover:text-brand-red-400"
            >
              {customer.name}
            </Link>
            <span className="text-stone-500 dark:text-stone-400">
              {customer.orders} order{customer.orders === 1 ? "" : "s"} · GHS {customer.spend.toFixed(2)}
            </span>
          </li>
        ))}
        {insights.topCustomers.length === 0 && (
          <li className="py-2 text-sm text-stone-500 dark:text-stone-400">No customer orders in this period.</li>
        )}
      </ul>
    </section>
  );
}
