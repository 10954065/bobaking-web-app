import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission } from "@/modules/auth/services/authorization.service";
import { listPromotions } from "@/modules/promotions/services/promotion.service";
import { listCampaigns } from "@/modules/marketing/services/campaign.service";

export default async function MarketingHomePage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  const canViewPromotions = hasAnyPermission(profile, "promotions", "read");
  const canViewCampaigns = hasAnyPermission(profile, "marketing", "read");
  const canViewLoyalty = hasAnyPermission(profile, "loyalty", "read");

  if (!canViewPromotions && !canViewCampaigns && !canViewLoyalty) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view marketing.</p>
        </main>
      </div>
    );
  }

  const [promotions, campaigns] = await Promise.all([
    canViewPromotions ? listPromotions() : [],
    canViewCampaigns ? listCampaigns() : [],
  ]);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Marketing</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">Promotions, campaigns, and the loyalty program.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {canViewPromotions && (
            <Link
              href="/admin/marketing/promotions"
              className="rounded-xl border border-stone-200 bg-white p-6 transition-colors hover:border-brand-red-400 dark:border-stone-800 dark:bg-stone-900"
            >
              <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Promotions</p>
              <p className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-50">{promotions.length}</p>
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Coupon codes and discount rules</p>
            </Link>
          )}
          {canViewCampaigns && (
            <Link
              href="/admin/marketing/campaigns"
              className="rounded-xl border border-stone-200 bg-white p-6 transition-colors hover:border-brand-red-400 dark:border-stone-800 dark:bg-stone-900"
            >
              <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Campaigns</p>
              <p className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-50">{campaigns.length}</p>
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Target audiences with a promotion</p>
            </Link>
          )}
          {canViewLoyalty && (
            <Link
              href="/admin/marketing/loyalty"
              className="rounded-xl border border-stone-200 bg-white p-6 transition-colors hover:border-brand-red-400 dark:border-stone-800 dark:bg-stone-900"
            >
              <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Loyalty</p>
              <p className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-50">Program</p>
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Earn/redeem rates and rules</p>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
