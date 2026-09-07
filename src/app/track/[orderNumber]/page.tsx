import { notFound } from "next/navigation";
import { getPublicOrderTracking } from "@/modules/orders/services/order-tracking.service";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Order started",
  PENDING_PAYMENT: "Awaiting payment",
  PAYMENT_FAILED: "Payment failed",
  CONFIRMED: "Order confirmed",
  ACCEPTED: "Order accepted",
  SENT_TO_KITCHEN: "Sent to kitchen",
  PREPARING: "Being prepared",
  READY: "Ready",
  ASSIGNED_TO_RIDER: "Rider assigned",
  PICKED_UP: "Picked up by rider",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  REJECTED: "Rejected",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

export default async function TrackOrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const tracking = await getPublicOrderTracking(orderNumber);
  if (!tracking) notFound();

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <header className="border-b border-stone-200 bg-white px-6 py-4 dark:border-stone-800 dark:bg-stone-900">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">Flicks &amp; Licks</p>
        <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Track your order</h1>
      </header>

      <main className="mx-auto max-w-lg px-6 py-8">
        <section className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-50">{tracking.orderNumber}</h2>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-950 dark:text-orange-300">
              {statusLabel(tracking.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {tracking.branchName} · {tracking.type.replaceAll("_", " ")}
          </p>

          <ul className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
            {tracking.items.map((item, index) => (
              <li key={index} className="flex justify-between py-2 text-sm text-stone-700 dark:text-stone-300">
                <span>
                  {item.quantity} × {item.productName}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-stone-100 pt-3 text-sm font-semibold text-stone-900 dark:border-stone-800 dark:text-stone-50">
            <span>Total</span>
            <span>GHS {tracking.total.toFixed(2)}</span>
          </div>

          {tracking.rider && (
            <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              {tracking.rider.firstName} is on the way
              {tracking.rider.lastLocationAt &&
                ` · last update ${new Date(tracking.rider.lastLocationAt).toLocaleTimeString()}`}
            </p>
          )}
        </section>

        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">Timeline</h3>
          <ol className="mt-4 space-y-3">
            {tracking.statusHistory.map((entry, index) => (
              <li key={index} className="flex items-center gap-3">
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-orange-500" />
                <span className="text-sm text-stone-700 dark:text-stone-300">{statusLabel(entry.toStatus)}</span>
                <span className="ml-auto text-xs text-stone-400 dark:text-stone-500">
                  {new Date(entry.createdAt).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
