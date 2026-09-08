import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission } from "@/modules/auth/services/authorization.service";
import { getLoyaltyConfig } from "@/modules/loyalty/services/loyalty.service";
import { AdminHeader } from "@/components/AdminHeader";
import { updateLoyaltyConfigFormAction } from "./actions";

export default async function LoyaltyConfigPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "loyalty", "read")) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
        <AdminHeader />
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view loyalty settings.</p>
        </main>
      </div>
    );
  }

  const canManage = hasAnyPermission(profile, "loyalty", "update");
  const config = await getLoyaltyConfig();

  const pointsPerCurrency = Number(config.pointsPerCurrency);
  const redemptionValue = Number(config.redemptionValue);
  const earnExample = Math.floor(50 * pointsPerCurrency);
  const redeemExample = Math.round(config.minPointsToRedeem * redemptionValue * 100) / 100;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <AdminHeader />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Loyalty program</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Earn rate applies at successful payment; redemption applies at checkout.
            </p>
          </div>
          <Link
            href="/admin/marketing"
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Back to marketing
          </Link>
        </div>

        <section className="mb-6 rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            With the current settings: a GHS 50.00 order earns <strong>{earnExample} points</strong>. The minimum redemption
            of {config.minPointsToRedeem} points is worth <strong>GHS {redeemExample.toFixed(2)}</strong>.
          </p>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">Settings</h3>
          <form action={updateLoyaltyConfigFormAction} className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">
                  Points earned per GHS spent
                </label>
                <input
                  type="number"
                  name="pointsPerCurrency"
                  step="0.0001"
                  min="0"
                  defaultValue={pointsPerCurrency}
                  disabled={!canManage}
                  className="mt-1 w-40 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">GHS value per point</label>
                <input
                  type="number"
                  name="redemptionValue"
                  step="0.0001"
                  min="0"
                  defaultValue={redemptionValue}
                  disabled={!canManage}
                  className="mt-1 w-40 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Minimum points to redeem</label>
                <input
                  type="number"
                  name="minPointsToRedeem"
                  min="1"
                  defaultValue={config.minPointsToRedeem}
                  disabled={!canManage}
                  className="mt-1 w-40 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm text-stone-700 dark:text-stone-300">
                <input type="checkbox" name="isActive" defaultChecked={config.isActive} disabled={!canManage} />
                Program active
              </label>
            </div>
            {canManage && (
              <button
                type="submit"
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
              >
                Save settings
              </button>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}
