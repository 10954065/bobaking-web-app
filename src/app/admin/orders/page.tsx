import Link from "next/link";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, hasPermission, getAccessibleBranchIds } from "@/modules/auth/services/authorization.service";
import { listOrdersForBranch } from "@/modules/orders/services/order.service";
import { OrderRefundControl } from "@/components/admin/OrderRefundControl";

/** The most recent payment still holding money we could hand back — same statuses refundRemainingBalance (payment.service.ts) will act on. */
const REFUNDABLE_PAYMENT_STATUSES = new Set(["SUCCEEDED", "PARTIALLY_REFUNDED"]);

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  PENDING_PAYMENT: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  PAYMENT_FAILED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  ACCEPTED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  SENT_TO_KITCHEN: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  PREPARING: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  READY: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELLED: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  REFUNDED: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const STATUS_FILTERS: OrderStatus[] = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "ACCEPTED",
  "SENT_TO_KITCHEN",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
];

const PAGE_SIZE = 25;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "orders", "read")) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view orders.</p>
        </main>
      </div>
    );
  }

  const { status: statusParam, page: pageParam } = await searchParams;
  const statusFilter = statusParam && STATUS_FILTERS.includes(statusParam as OrderStatus) ? (statusParam as OrderStatus) : undefined;
  const page = Math.max(1, Number(pageParam) || 1);

  function pageHref(targetPage: number, targetStatus = statusParam) {
    const params = new URLSearchParams();
    if (targetStatus) params.set("status", targetStatus);
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return query ? `/admin/orders?${query}` : "/admin/orders";
  }

  const branchAccess = getAccessibleBranchIds(profile, "orders", "read");
  // Fetch one extra row to know whether a next page exists without a
  // separate count query — sliced back off before rendering.
  const fetched = await listOrdersForBranch(branchAccess, {
    status: statusFilter,
    limit: PAGE_SIZE + 1,
    offset: (page - 1) * PAGE_SIZE,
  });
  const hasNextPage = fetched.length > PAGE_SIZE;
  const orders = fetched.slice(0, PAGE_SIZE);

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-4 flex flex-wrap gap-1.5">
          <Link
            href={pageHref(1, undefined)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              !statusFilter
                ? "bg-brand-red-600 text-white"
                : "border border-stone-300 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
            }`}
          >
            All
          </Link>
          {STATUS_FILTERS.map((s) => (
            <Link
              key={s}
              href={pageHref(1, s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? "bg-brand-red-600 text-white"
                  : "border border-stone-300 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
              }`}
            >
              {s.replaceAll("_", " ")}
            </Link>
          ))}
        </div>

        <section className="rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-stone-900/5 transition-shadow duration-200 hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
          <h2 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">
            Orders ({orders.length}{hasNextPage ? "+" : ""})
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
                <tr>
                  <th className="px-6 py-2 font-medium">Order</th>
                  <th className="px-6 py-2 font-medium">Branch</th>
                  <th className="px-6 py-2 font-medium">Customer</th>
                  <th className="px-6 py-2 font-medium">Type</th>
                  <th className="px-6 py-2 font-medium">Items</th>
                  <th className="px-6 py-2 font-medium">Total</th>
                  <th className="px-6 py-2 font-medium">Status</th>
                  <th className="px-6 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {orders.map((order) => {
                  const refundablePayment = order.payments.find((p) => REFUNDABLE_PAYMENT_STATUSES.has(p.status));
                  const remaining = refundablePayment
                    ? Number(refundablePayment.amount) -
                      refundablePayment.refunds.filter((r) => r.status === "SUCCEEDED").reduce((sum, r) => sum + Number(r.amount), 0)
                    : 0;
                  const canRefund = refundablePayment && remaining > 0 && hasPermission(profile, "payments", "refund", order.branchId);

                  return (
                    <tr key={order.id}>
                      <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">{order.orderNumber}</td>
                      <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{order.branch.name}</td>
                      <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                        {order.customer.firstName} {order.customer.lastName}
                      </td>
                      <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{order.type}</td>
                      <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{order.items.length}</td>
                      <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                        GHS {Number(order.total).toFixed(2)}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[order.status] ?? ""}`}
                        >
                          {order.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {canRefund && refundablePayment && <OrderRefundControl paymentId={refundablePayment.id} remaining={remaining} />}
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                      No orders {statusFilter ? `with status ${statusFilter.replaceAll("_", " ").toLowerCase()}` : "yet"}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {(page > 1 || hasNextPage) && (
            <div className="flex items-center justify-between border-t border-stone-100 px-6 py-3 dark:border-stone-800">
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-xs text-stone-400 dark:text-stone-500">Page {page}</span>
              {hasNextPage ? (
                <Link
                  href={pageHref(page + 1)}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Next →
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
