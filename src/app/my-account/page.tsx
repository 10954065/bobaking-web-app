import Link from "next/link";
import { ArrowLeft, Repeat2, UserRound } from "lucide-react";
import { getCurrentCustomer } from "@/modules/customer-auth/services/current-customer.service";
import { listOrdersForCustomer } from "@/modules/orders/services/order.service";
import { Logo } from "@/components/brand/Logo";
import { AccountAuthGate } from "@/components/account/AccountAuthGate";
import { signOutFromMyAccountAction } from "./actions";

// Reads the customer_session cookie (a dynamic API) — see /order/page.tsx's
// identical note on why this can't be left to Next's default static
// detection when the page also renders client-hydrated bits (AccountAuthGate).
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Order started",
  PENDING_PAYMENT: "Awaiting payment",
  PAYMENT_FAILED: "Payment failed",
  CONFIRMED: "Payment received",
  ACCEPTED: "Accepted",
  SENT_TO_KITCHEN: "In the kitchen",
  PREPARING: "Being prepared",
  READY: "Ready",
  ASSIGNED_TO_RIDER: "Rider assigned",
  PICKED_UP: "Picked up",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  REJECTED: "Not accepted",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

function statusPillClass(status: string): string {
  if (status === "REJECTED" || status === "CANCELLED" || status === "PAYMENT_FAILED") return "bg-red-50 text-red-700";
  if (status === "DELIVERED" || status === "COMPLETED") return "bg-emerald-50 text-emerald-700";
  return "bg-brand-red/10 text-brand-red-700";
}

// Storefront checkout only ever creates DELIVERY/PICKUP orders (see
// getReorderCartAction) — a DINE_IN row here would only exist if staff
// placed it via POS, and can't be replayed through the online cart.
const REORDERABLE_TYPES = new Set(["DELIVERY", "PICKUP"]);

export default async function MyAccountPage() {
  const customer = await getCurrentCustomer();

  if (!customer) {
    return (
      <div className="min-h-screen bg-brand-cream text-brand-ink">
        <AccountAuthGate />
      </div>
    );
  }

  const orders = await listOrdersForCustomer(customer.id, 20);

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="flex items-center justify-between border-b border-brand-ink/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Logo size={36} ring={false} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-red-700">Boba King</p>
            <h1 className="text-base font-semibold text-brand-ink">My account</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/order"
            className="flex items-center gap-1.5 rounded-lg border border-brand-ink/12 px-3 py-2 text-sm font-medium text-brand-ink/75 transition-colors hover:bg-brand-ink/8"
          >
            <ArrowLeft size={15} /> Order
          </Link>
          <form action={signOutFromMyAccountAction}>
            <button
              type="submit"
              className="rounded-lg border border-brand-ink/12 px-3 py-2 text-sm font-medium text-brand-ink/75 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-4 py-8 sm:px-6">
        <section className="flex items-center gap-4 rounded-xl border border-brand-ink/10 bg-white p-6">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-red/10 text-brand-red-700">
            <UserRound size={24} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-brand-ink">
              {customer.firstName || customer.lastName ? `${customer.firstName} ${customer.lastName}`.trim() : "Welcome"}
            </p>
            <p className="truncate text-sm text-brand-ink/55">{customer.phone}</p>
            {customer.email && <p className="truncate text-sm text-brand-ink/45">{customer.email}</p>}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-brand-ink/55">Order history</h2>

          {orders.length === 0 ? (
            <div className="rounded-xl border border-brand-ink/10 bg-white p-6 text-center text-sm text-brand-ink/55">
              No orders yet.{" "}
              <Link href="/order" className="font-medium text-brand-red-700 hover:underline">
                Start an order
              </Link>
              .
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li key={order.id} className="rounded-xl border border-brand-ink/10 bg-white p-4">
                  <Link href={`/track/${order.trackingToken}`} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-brand-ink">{order.orderNumber}</p>
                      <p className="truncate text-xs text-brand-ink/55">
                        {order.branch.name} · {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClass(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                  </Link>

                  <p className="mt-2 truncate text-xs text-brand-ink/45">
                    {order.items.map((item) => `${item.quantity}× ${item.productName}`).join(", ")}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-brand-ink/10 pt-3">
                    <span className="text-sm font-semibold text-brand-ink">GHS {Number(order.total).toFixed(2)}</span>
                    {REORDERABLE_TYPES.has(order.type) && (
                      <Link
                        href={`/order?reorder=${order.id}`}
                        className="flex items-center gap-1.5 rounded-lg border border-brand-ink/12 px-3 py-1.5 text-xs font-medium text-brand-ink/75 transition-colors hover:bg-brand-ink/8"
                      >
                        <Repeat2 size={13} /> Reorder
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
