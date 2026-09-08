import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, getAccessibleBranchIds } from "@/modules/auth/services/authorization.service";
import { listBranches } from "@/modules/branches/services/branch.service";
import { listZonesForBranch } from "@/modules/delivery/services/delivery-zone.service";
import { createZoneFormAction, deactivateZoneFormAction } from "./actions";

export default async function DeliveryZonesPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "delivery", "read")) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view delivery zones.</p>
        </main>
      </div>
    );
  }

  const accessibleBranchIds = getAccessibleBranchIds(profile, "delivery", "read");
  const branches = await listBranches(accessibleBranchIds === "ALL" ? {} : { branchIds: accessibleBranchIds });

  const { branch: branchParam } = await searchParams;
  const branchId = branchParam ?? branches[0]?.id;
  const currentBranch = branches.find((b) => b.id === branchId);

  if (!branchId || !currentBranch) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">No branch access configured for delivery.</p>
        </main>
      </div>
    );
  }

  const canManage = hasAnyPermission(profile, "delivery", "update");
  const zones = await listZonesForBranch(branchId, { includeInactive: true });

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Delivery zones</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Fee charged when a delivery address&apos;s area matches, per branch. No match falls back to the branch&apos;s default fee.
            </p>
          </div>
          <Link
            href="/admin/delivery"
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Back to delivery board
          </Link>
        </div>

        {branches.length > 1 && (
          <div className="mb-4 flex gap-1">
            {branches.map((b) => (
              <Link
                key={b.id}
                href={`/admin/delivery/zones?branch=${b.id}`}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  b.id === branchId
                    ? "bg-brand-red-600 text-white"
                    : "bg-white text-stone-600 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800"
                }`}
              >
                {b.name}
              </Link>
            ))}
          </div>
        )}

        <section className="mb-8 rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-stone-900/5 transition-shadow duration-200 hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
          <h3 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">
            Zones &middot; {currentBranch.name} ({zones.length})
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
                <tr>
                  <th className="px-6 py-2 font-medium">Zone</th>
                  <th className="px-6 py-2 font-medium">Matches area</th>
                  <th className="px-6 py-2 font-medium">Fee</th>
                  <th className="px-6 py-2 font-medium">Est. minutes</th>
                  <th className="px-6 py-2 font-medium">Status</th>
                  {canManage && <th className="px-6 py-2 font-medium"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {zones.map((zone) => (
                  <tr key={zone.id}>
                    <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">{zone.name}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{zone.areaMatch}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">GHS {Number(zone.fee).toFixed(2)}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{zone.estimatedMinutes ?? "N/A"}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          zone.isActive
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-500"
                        }`}
                      >
                        {zone.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-6 py-3 text-right">
                        {zone.isActive && (
                          <form action={deactivateZoneFormAction.bind(null, zone.id, branchId)}>
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
                {zones.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                      No zones configured. Deliveries at this branch use the default fee.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {canManage && (
          <section className="rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-stone-900/5 transition-shadow duration-200 hover:shadow-md p-6 dark:border-stone-800 dark:bg-stone-900">
            <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">Add zone</h3>
            <form action={createZoneFormAction.bind(null, branchId)} className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Zone name</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. East Legon"
                  className="mt-1 w-48 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Matches area (exact text)</label>
                <input
                  type="text"
                  name="areaMatch"
                  required
                  placeholder="e.g. East Legon"
                  className="mt-1 w-48 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Fee (GHS)</label>
                <input
                  type="number"
                  name="fee"
                  step="0.01"
                  min="0"
                  required
                  className="mt-1 w-28 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Est. minutes</label>
                <input
                  type="number"
                  name="estimatedMinutes"
                  min="1"
                  className="mt-1 w-28 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-brand-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red-500"
              >
                Add zone
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
