import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission } from "@/modules/auth/services/authorization.service";
import { listPromotions } from "@/modules/promotions/services/promotion.service";
import { listBranches } from "@/modules/branches/services/branch.service";
import { createPromotionFormAction, deactivatePromotionFormAction } from "./actions";

export default async function PromotionsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "promotions", "read")) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view promotions.</p>
        </main>
      </div>
    );
  }

  const canManage = hasAnyPermission(profile, "promotions", "create");
  const [promotions, branches] = await Promise.all([listPromotions({ includeInactive: true }), listBranches()]);

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Promotions</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">Coupon codes customers or staff enter at checkout.</p>
          </div>
          <Link
            href="/admin/marketing"
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Back to marketing
          </Link>
        </div>

        <section className="mb-8 rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-stone-900/5 transition-shadow duration-200 hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
          <h3 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">
            Promotions ({promotions.length})
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
                <tr>
                  <th className="px-6 py-2 font-medium">Code</th>
                  <th className="px-6 py-2 font-medium">Name</th>
                  <th className="px-6 py-2 font-medium">Discount</th>
                  <th className="px-6 py-2 font-medium">Branch</th>
                  <th className="px-6 py-2 font-medium">Status</th>
                  {canManage && <th className="px-6 py-2 font-medium"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {promotions.map((promo) => (
                  <tr key={promo.id}>
                    <td className="px-6 py-3 font-mono font-medium text-stone-900 dark:text-stone-50">{promo.code}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{promo.name}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                      {promo.discountType === "PERCENTAGE"
                        ? `${Number(promo.discountValue)}%`
                        : `GHS ${Number(promo.discountValue).toFixed(2)}`}
                    </td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{promo.branch?.name ?? "All branches"}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          promo.isActive
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-500"
                        }`}
                      >
                        {promo.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-6 py-3 text-right">
                        {promo.isActive && (
                          <form action={deactivatePromotionFormAction.bind(null, promo.id)}>
                            <button
                              type="submit"
                              className="text-xs font-medium text-stone-500 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400"
                            >
                              Deactivate
                            </button>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {promotions.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                      No promotions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {canManage && (
          <section className="rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-stone-900/5 transition-shadow duration-200 hover:shadow-md p-6 dark:border-stone-800 dark:bg-stone-900">
            <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">Add promotion</h3>
            <form action={createPromotionFormAction} className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Code</label>
                <input
                  type="text"
                  name="code"
                  required
                  placeholder="WELCOME10"
                  className="mt-1 w-36 rounded-lg border border-stone-300 px-3 py-2 text-sm uppercase outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 shadow-[inset_0_1px_3px_rgba(41,26,20,0.10),inset_0_-1px_0_rgba(255,255,255,0.85)] transition-shadow duration-150 focus:shadow-[inset_0_1px_2px_rgba(41,26,20,0.06),0_0_0_3px_rgba(228,35,19,0.12)] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.55),inset_0_-1px_0_rgba(255,255,255,0.04)] dark:focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_0_0_3px_rgba(228,35,19,0.18)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Welcome discount"
                  className="mt-1 w-48 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 shadow-[inset_0_1px_3px_rgba(41,26,20,0.10),inset_0_-1px_0_rgba(255,255,255,0.85)] transition-shadow duration-150 focus:shadow-[inset_0_1px_2px_rgba(41,26,20,0.06),0_0_0_3px_rgba(228,35,19,0.12)] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.55),inset_0_-1px_0_rgba(255,255,255,0.04)] dark:focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_0_0_3px_rgba(228,35,19,0.18)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Discount type</label>
                <select
                  name="discountType"
                  defaultValue="PERCENTAGE"
                  className="mt-1 w-36 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 shadow-[inset_0_1px_3px_rgba(41,26,20,0.10),inset_0_-1px_0_rgba(255,255,255,0.85)] transition-shadow duration-150 focus:shadow-[inset_0_1px_2px_rgba(41,26,20,0.06),0_0_0_3px_rgba(228,35,19,0.12)] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.55),inset_0_-1px_0_rgba(255,255,255,0.04)] dark:focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_0_0_3px_rgba(228,35,19,0.18)]"
                >
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED_AMOUNT">Fixed amount</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Value</label>
                <input
                  type="number"
                  name="discountValue"
                  step="0.01"
                  min="0"
                  required
                  placeholder="10"
                  className="mt-1 w-24 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 shadow-[inset_0_1px_3px_rgba(41,26,20,0.10),inset_0_-1px_0_rgba(255,255,255,0.85)] transition-shadow duration-150 focus:shadow-[inset_0_1px_2px_rgba(41,26,20,0.06),0_0_0_3px_rgba(228,35,19,0.12)] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.55),inset_0_-1px_0_rgba(255,255,255,0.04)] dark:focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_0_0_3px_rgba(228,35,19,0.18)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Min. subtotal (GHS)</label>
                <input
                  type="number"
                  name="minSubtotal"
                  step="0.01"
                  min="0"
                  className="mt-1 w-32 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 shadow-[inset_0_1px_3px_rgba(41,26,20,0.10),inset_0_-1px_0_rgba(255,255,255,0.85)] transition-shadow duration-150 focus:shadow-[inset_0_1px_2px_rgba(41,26,20,0.06),0_0_0_3px_rgba(228,35,19,0.12)] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.55),inset_0_-1px_0_rgba(255,255,255,0.04)] dark:focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_0_0_3px_rgba(228,35,19,0.18)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Max discount (GHS)</label>
                <input
                  type="number"
                  name="maxDiscountAmount"
                  step="0.01"
                  min="0"
                  className="mt-1 w-32 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 shadow-[inset_0_1px_3px_rgba(41,26,20,0.10),inset_0_-1px_0_rgba(255,255,255,0.85)] transition-shadow duration-150 focus:shadow-[inset_0_1px_2px_rgba(41,26,20,0.06),0_0_0_3px_rgba(228,35,19,0.12)] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.55),inset_0_-1px_0_rgba(255,255,255,0.04)] dark:focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_0_0_3px_rgba(228,35,19,0.18)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Branch</label>
                <select
                  name="branchId"
                  defaultValue=""
                  className="mt-1 w-40 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 shadow-[inset_0_1px_3px_rgba(41,26,20,0.10),inset_0_-1px_0_rgba(255,255,255,0.85)] transition-shadow duration-150 focus:shadow-[inset_0_1px_2px_rgba(41,26,20,0.06),0_0_0_3px_rgba(228,35,19,0.12)] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.55),inset_0_-1px_0_rgba(255,255,255,0.04)] dark:focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_0_0_3px_rgba(228,35,19,0.18)]"
                >
                  <option value="">All branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Usage limit</label>
                <input
                  type="number"
                  name="usageLimit"
                  min="1"
                  placeholder="Unlimited"
                  className="mt-1 w-28 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 shadow-[inset_0_1px_3px_rgba(41,26,20,0.10),inset_0_-1px_0_rgba(255,255,255,0.85)] transition-shadow duration-150 focus:shadow-[inset_0_1px_2px_rgba(41,26,20,0.06),0_0_0_3px_rgba(228,35,19,0.12)] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.55),inset_0_-1px_0_rgba(255,255,255,0.04)] dark:focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_0_0_3px_rgba(228,35,19,0.18)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Per customer</label>
                <input
                  type="number"
                  name="usageLimitPerCustomer"
                  min="1"
                  defaultValue={1}
                  className="mt-1 w-24 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 shadow-[inset_0_1px_3px_rgba(41,26,20,0.10),inset_0_-1px_0_rgba(255,255,255,0.85)] transition-shadow duration-150 focus:shadow-[inset_0_1px_2px_rgba(41,26,20,0.06),0_0_0_3px_rgba(228,35,19,0.12)] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.55),inset_0_-1px_0_rgba(255,255,255,0.04)] dark:focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_0_0_3px_rgba(228,35,19,0.18)]"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-brand-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red-500"
              >
                Add promotion
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
