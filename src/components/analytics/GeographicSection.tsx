import type { DeliveryPerformance, GeoBreakdownRow } from "@/modules/analytics/services/geo-analytics.service";

export function GeographicSection({
  geoRows,
  deliveryPerformance,
}: {
  geoRows: GeoBreakdownRow[];
  deliveryPerformance: DeliveryPerformance;
}) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <h3 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">Delivery orders by area</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
              <tr>
                <th className="px-6 py-2 font-medium">Area / zone</th>
                <th className="px-6 py-2 font-medium">Orders</th>
                <th className="px-6 py-2 font-medium">Revenue</th>
                <th className="px-6 py-2 font-medium">Delivery fees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {geoRows.map((row) => (
                <tr key={row.label}>
                  <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">{row.label}</td>
                  <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{row.orders}</td>
                  <td className="px-6 py-3 text-stone-600 dark:text-stone-400">GHS {row.revenue.toFixed(2)}</td>
                  <td className="px-6 py-3 text-stone-600 dark:text-stone-400">GHS {row.deliveryFeeRevenue.toFixed(2)}</td>
                </tr>
              ))}
              {geoRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                    No delivery orders in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">Delivery performance</h3>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          {deliveryPerformance.overallDeliveries} completed deliveries · avg{" "}
          <strong>{deliveryPerformance.overallAvgMinutes ?? "N/A"} min</strong> from rider pickup to arrival
        </p>
        <ul className="mt-4 space-y-3">
          {deliveryPerformance.byZone.map((zone) => (
            <li key={zone.label} className="flex items-center justify-between text-sm">
              <span className="text-stone-700 dark:text-stone-300">{zone.label}</span>
              <span className="text-stone-500 dark:text-stone-400">
                {zone.deliveries} deliveries · avg {zone.avgMinutes} min
                {zone.onTimeRate !== null && ` · ${zone.onTimeRate}% on time`}
              </span>
            </li>
          ))}
          {deliveryPerformance.byZone.length === 0 && (
            <li className="text-sm text-stone-500 dark:text-stone-400">No completed deliveries in this period.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
