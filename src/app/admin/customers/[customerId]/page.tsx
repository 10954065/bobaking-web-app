import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission } from "@/modules/auth/services/authorization.service";
import { getCustomerById } from "@/modules/customers/services/customer.service";
import { listOrdersForCustomer } from "@/modules/orders/services/order.service";
import { getLoyaltyAccountForCustomer, listLoyaltyTransactionsForCustomer } from "@/modules/loyalty/services/loyalty.service";
import { adjustPointsFormAction } from "./actions";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  PENDING_PAYMENT: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  PAYMENT_FAILED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  DELIVERED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELLED: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  REFUNDED: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export default async function CustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const { customerId } = await params;
  const customer = await getCustomerById(customerId);
  if (!customer) notFound();

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "customers", "read")) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view customers.</p>
        </main>
      </div>
    );
  }

  const canManageLoyalty = hasAnyPermission(profile, "loyalty", "update");
  const canViewLoyalty = hasAnyPermission(profile, "loyalty", "read") || canManageLoyalty;

  const [orders, loyaltyAccount, loyaltyTransactions] = await Promise.all([
    listOrdersForCustomer(customerId),
    canViewLoyalty ? getLoyaltyAccountForCustomer(customerId) : null,
    canViewLoyalty ? listLoyaltyTransactionsForCustomer(customerId, 10) : [],
  ]);

  const lifetimeSpend = orders
    .filter((o) => !["DRAFT", "CANCELLED", "REJECTED", "PAYMENT_FAILED", "REFUNDED"].includes(o.status))
    .reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
              {customer.firstName} {customer.lastName}
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {customer.email ?? "N/A"} · {customer.phone ?? "N/A"} · {customer.status}
            </p>
          </div>
          <Link
            href="/admin/customers"
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Back to customers
          </Link>
        </div>

        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Orders</p>
            <p className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-50">{orders.length}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Lifetime spend</p>
            <p className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-50">GHS {lifetimeSpend.toFixed(2)}</p>
          </div>
          {canViewLoyalty && (
            <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
              <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Loyalty points</p>
              <p className="mt-1 text-2xl font-bold text-brand-red-600">{loyaltyAccount?.pointsBalance ?? 0}</p>
            </div>
          )}
        </div>

        <section className="mb-8 rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <h3 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">Addresses</h3>
          <ul className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
            {customer.addresses.map((address) => (
              <li key={address.id} className="px-6 py-3 text-sm">
                <span className="font-medium text-stone-900 dark:text-stone-50">{address.addressLine1}</span>
                <span className="text-stone-500 dark:text-stone-400">
                  {" "}
                  · {[address.area, address.landmark].filter(Boolean).join(" · ") || "No area/landmark"}
                  {address.isDefault ? " · Default" : ""}
                </span>
              </li>
            ))}
            {customer.addresses.length === 0 && (
              <li className="px-6 py-4 text-sm text-stone-500 dark:text-stone-400">No saved addresses.</li>
            )}
          </ul>
        </section>

        <section className="mb-8 rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <h3 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">
            Order history ({orders.length})
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
                <tr>
                  <th className="px-6 py-2 font-medium">Order</th>
                  <th className="px-6 py-2 font-medium">Branch</th>
                  <th className="px-6 py-2 font-medium">Type</th>
                  <th className="px-6 py-2 font-medium">Total</th>
                  <th className="px-6 py-2 font-medium">Status</th>
                  <th className="px-6 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">{order.orderNumber}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{order.branch.name}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{order.type}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">GHS {Number(order.total).toFixed(2)}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[order.status] ?? ""}`}>
                        {order.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                      No orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {canViewLoyalty && (
          <section className="rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
            <h3 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">
              Loyalty activity, balance: {loyaltyAccount?.pointsBalance ?? 0} points
            </h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
                  <tr>
                    <th className="px-6 py-2 font-medium">Type</th>
                    <th className="px-6 py-2 font-medium">Points</th>
                    <th className="px-6 py-2 font-medium">Balance after</th>
                    <th className="px-6 py-2 font-medium">Reason</th>
                    <th className="px-6 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {loyaltyTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{tx.type}</td>
                      <td className={`px-6 py-3 font-medium ${tx.points >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {tx.points >= 0 ? "+" : ""}
                        {tx.points}
                      </td>
                      <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{tx.balanceAfter}</td>
                      <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{tx.reason ?? "N/A"}</td>
                      <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {loyaltyTransactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                        No loyalty activity yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {canManageLoyalty && (
              <form action={adjustPointsFormAction.bind(null, customerId)} className="flex flex-wrap items-end gap-3 px-6 py-6">
                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Adjust points (±)</label>
                  <input
                    type="number"
                    name="points"
                    required
                    className="mt-1 w-28 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Reason</label>
                  <input
                    type="text"
                    name="reason"
                    required
                    placeholder="e.g. Goodwill gesture"
                    className="mt-1 w-64 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red-500"
                >
                  Apply adjustment
                </button>
              </form>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
