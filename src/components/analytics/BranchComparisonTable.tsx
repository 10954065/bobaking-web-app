import type { BranchComparisonRow } from "@/modules/analytics/services/sales-analytics.service";

export function BranchComparisonTable({ rows }: { rows: BranchComparisonRow[] }) {
  return (
    <section className="mb-8 rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <h3 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">Branch comparison</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
            <tr>
              <th className="px-6 py-2 font-medium">Branch</th>
              <th className="px-6 py-2 font-medium">Orders</th>
              <th className="px-6 py-2 font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {rows.map((row) => (
              <tr key={row.branchId}>
                <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">{row.branchName}</td>
                <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{row.orders}</td>
                <td className="px-6 py-3 text-stone-600 dark:text-stone-400">GHS {row.revenue.toFixed(2)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
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
  );
}
