import type { OrderTypeBreakdownRow, StatusBreakdownRow } from "@/modules/analytics/services/sales-analytics.service";

const TYPE_LABELS: Record<string, string> = {
  DELIVERY: "Delivery",
  PICKUP: "Pickup",
  DINE_IN: "Dine-in",
};

export function OrderBreakdownSection({
  statusBreakdown,
  typeBreakdown,
}: {
  statusBreakdown: StatusBreakdownRow[];
  typeBreakdown: OrderTypeBreakdownRow[];
}) {
  const totalStatusCount = statusBreakdown.reduce((sum, row) => sum + row.count, 0) || 1;

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">Order status breakdown</h3>
        <ul className="mt-4 space-y-2">
          {statusBreakdown.map((row) => (
            <li key={row.status}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-700 dark:text-stone-300">{row.status.replaceAll("_", " ")}</span>
                <span className="font-medium text-stone-900 dark:text-stone-50">{row.count}</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-stone-100 dark:bg-stone-800">
                <div
                  className="h-1.5 rounded-full bg-brand-red-500 dark:bg-brand-red-600"
                  style={{ width: `${Math.round((row.count / totalStatusCount) * 100)}%` }}
                />
              </div>
            </li>
          ))}
          {statusBreakdown.length === 0 && (
            <li className="text-sm text-stone-500 dark:text-stone-400">No orders in this period.</li>
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <h3 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">Order type breakdown</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
              <tr>
                <th className="px-6 py-2 font-medium">Type</th>
                <th className="px-6 py-2 font-medium">Orders</th>
                <th className="px-6 py-2 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {typeBreakdown.map((row) => (
                <tr key={row.type}>
                  <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">{TYPE_LABELS[row.type] ?? row.type}</td>
                  <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{row.count}</td>
                  <td className="px-6 py-3 text-stone-600 dark:text-stone-400">GHS {row.revenue.toFixed(2)}</td>
                </tr>
              ))}
              {typeBreakdown.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                    No orders in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
