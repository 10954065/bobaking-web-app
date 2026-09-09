import { redirect } from "next/navigation";
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

export default async function AdminOrdersPage() {
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

  const branchAccess = getAccessibleBranchIds(profile, "orders", "read");
  const orders = await listOrdersForBranch(branchAccess);

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <section className="rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-stone-900/5 transition-shadow duration-200 hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
          <h2 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">
            Orders ({orders.length})
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
                      No orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
