import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, getAccessibleBranchIds } from "@/modules/auth/services/authorization.service";
import { listBranches } from "@/modules/branches/services/branch.service";
import { listRidersForBranch } from "@/modules/delivery/services/rider.service";
import { createRiderFormAction } from "./actions";

const STATUS_COLORS: Record<string, string> = {
  OFFLINE: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  AVAILABLE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  ON_DELIVERY: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
};

export default async function DeliveryRidersPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "riders", "read")) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view riders.</p>
        </main>
      </div>
    );
  }

  const accessibleBranchIds = getAccessibleBranchIds(profile, "riders", "read");
  const branches = await listBranches(accessibleBranchIds === "ALL" ? {} : { branchIds: accessibleBranchIds });

  const { branch: branchParam } = await searchParams;
  const branchId = branchParam ?? branches[0]?.id;
  const currentBranch = branches.find((b) => b.id === branchId);

  if (!branchId || !currentBranch) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">No branch access configured for riders.</p>
        </main>
      </div>
    );
  }

  const canCreate = hasAnyPermission(profile, "riders", "create");
  const riders = await listRidersForBranch(branchId);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Riders</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">Delivery riders and their live status.</p>
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
                href={`/admin/delivery/riders?branch=${b.id}`}
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

        <section className="mb-8 rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <h3 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">
            Riders &middot; {currentBranch.name} ({riders.length})
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
                <tr>
                  <th className="px-6 py-2 font-medium">Name</th>
                  <th className="px-6 py-2 font-medium">Phone</th>
                  <th className="px-6 py-2 font-medium">Vehicle</th>
                  <th className="px-6 py-2 font-medium">Plate</th>
                  <th className="px-6 py-2 font-medium">Status</th>
                  <th className="px-6 py-2 font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {riders.map((rider) => (
                  <tr key={rider.id}>
                    <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">
                      {rider.user.firstName} {rider.user.lastName}
                    </td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{rider.user.phone ?? rider.user.email ?? "N/A"}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{rider.vehicleType.replaceAll("_", " ")}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{rider.plateNumber ?? "N/A"}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[rider.status] ?? ""}`}>
                        {rider.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                      {rider.lastLocationAt ? new Date(rider.lastLocationAt).toLocaleTimeString() : "Never"}
                    </td>
                  </tr>
                ))}
                {riders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                      No riders at this branch yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {canCreate && (
          <section className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
            <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">Add rider</h3>
            <form action={createRiderFormAction.bind(null, branchId)} className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">First name</label>
                <input
                  type="text"
                  name="firstName"
                  required
                  className="mt-1 w-36 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Last name</label>
                <input
                  type="text"
                  name="lastName"
                  required
                  className="mt-1 w-36 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Phone</label>
                <input
                  type="text"
                  name="phone"
                  className="mt-1 w-40 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Email</label>
                <input
                  type="email"
                  name="email"
                  className="mt-1 w-52 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  className="mt-1 w-40 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Vehicle</label>
                <select
                  name="vehicleType"
                  defaultValue="MOTORBIKE"
                  className="mt-1 w-36 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                >
                  <option value="MOTORBIKE">Motorbike</option>
                  <option value="BICYCLE">Bicycle</option>
                  <option value="CAR">Car</option>
                  <option value="ON_FOOT">On foot</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Plate number</label>
                <input
                  type="text"
                  name="plateNumber"
                  className="mt-1 w-32 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-brand-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red-500"
              >
                Add rider
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
