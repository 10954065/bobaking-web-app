import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission } from "@/modules/auth/services/authorization.service";
import { listCampaigns, computeAudienceSize } from "@/modules/marketing/services/campaign.service";
import { listPromotions } from "@/modules/promotions/services/promotion.service";
import { createCampaignFormAction, setCampaignStatusFormAction } from "./actions";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  ENDED: "bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-500",
};

const AUDIENCE_LABELS: Record<string, string> = {
  ALL_CUSTOMERS: "All customers",
  NEW_CUSTOMERS: "New customers (0 orders)",
  RETURNING_CUSTOMERS: "Returning customers (1+ orders)",
};

export default async function CampaignsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "marketing", "read")) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view campaigns.</p>
        </main>
      </div>
    );
  }

  const canManage = hasAnyPermission(profile, "marketing", "create");
  const [campaigns, promotions] = await Promise.all([listCampaigns(), listPromotions()]);
  const audienceSizes = await Promise.all(campaigns.map((c) => computeAudienceSize(c.audience)));

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Campaigns</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              A named initiative pairing a target audience with a promotion.
            </p>
          </div>
          <Link
            href="/admin/marketing"
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Back to marketing
          </Link>
        </div>

        <section className="mb-8 rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <h3 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">
            Campaigns ({campaigns.length})
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
                <tr>
                  <th className="px-6 py-2 font-medium">Name</th>
                  <th className="px-6 py-2 font-medium">Audience</th>
                  <th className="px-6 py-2 font-medium">Reach</th>
                  <th className="px-6 py-2 font-medium">Promotion</th>
                  <th className="px-6 py-2 font-medium">Status</th>
                  {canManage && <th className="px-6 py-2 font-medium"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {campaigns.map((campaign, index) => (
                  <tr key={campaign.id}>
                    <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">{campaign.name}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{AUDIENCE_LABELS[campaign.audience]}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{audienceSizes[index]} customers</td>
                    <td className="px-6 py-3 font-mono text-stone-600 dark:text-stone-400">{campaign.promotion?.code ?? "N/A"}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[campaign.status]}`}>
                        {campaign.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-6 py-3 text-right">
                        {campaign.status === "DRAFT" && (
                          <form action={setCampaignStatusFormAction.bind(null, campaign.id, "ACTIVE")}>
                            <button type="submit" className="text-xs font-medium text-emerald-600 hover:text-emerald-500">
                              Activate
                            </button>
                          </form>
                        )}
                        {campaign.status === "ACTIVE" && (
                          <form action={setCampaignStatusFormAction.bind(null, campaign.id, "ENDED")}>
                            <button type="submit" className="text-xs font-medium text-stone-500 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400">
                              End
                            </button>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                      No campaigns yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {canManage && (
          <section className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
            <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">Add campaign</h3>
            <form action={createCampaignFormAction} className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. New Year Welcome Back"
                  className="mt-1 w-56 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Audience</label>
                <select
                  name="audience"
                  defaultValue="ALL_CUSTOMERS"
                  className="mt-1 w-56 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                >
                  <option value="ALL_CUSTOMERS">All customers</option>
                  <option value="NEW_CUSTOMERS">New customers</option>
                  <option value="RETURNING_CUSTOMERS">Returning customers</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Promotion</label>
                <select
                  name="promotionId"
                  defaultValue=""
                  className="mt-1 w-48 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                >
                  <option value="">None</option>
                  {promotions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-brand-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red-500"
              >
                Add campaign
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
