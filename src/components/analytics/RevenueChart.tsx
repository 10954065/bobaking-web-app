import type { RevenuePoint } from "@/modules/analytics/services/sales-analytics.service";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const maxRevenue = Math.max(1, ...points.map((p) => p.revenue));
  // Beyond ~45 daily bars the chart gets too cramped to read individual days —
  // the 90-day preset still shows the shape of the trend, just unlabeled.
  const showLabels = points.length <= 45;

  return (
    <section className="mb-8 rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
      <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">Revenue over time</h3>

      <div className="mt-6 flex h-40 items-stretch gap-1">
        {points.map((point) => {
          const heightPct = Math.max(2, Math.round((point.revenue / maxRevenue) * 100));
          return (
            <div key={point.date} className="flex flex-1 flex-col justify-end">
              <div
                title={`${point.date}: GHS ${point.revenue.toFixed(2)} · ${point.orders} order${point.orders === 1 ? "" : "s"}`}
                className="w-full rounded-t bg-orange-500 transition-colors hover:bg-orange-400 dark:bg-orange-600"
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>

      {showLabels && (
        <div className="mt-1 flex gap-1">
          {points.map((point) => {
            const date = new Date(`${point.date}T00:00:00Z`);
            return (
              <p key={point.date} className="flex-1 truncate text-center text-[10px] text-stone-400 dark:text-stone-500">
                {WEEKDAY_LABELS[date.getUTCDay()]}
              </p>
            );
          })}
        </div>
      )}

      {points.every((p) => p.revenue === 0) && (
        <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">No revenue recorded in this period.</p>
      )}
    </section>
  );
}
