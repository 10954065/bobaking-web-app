import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, getAccessibleBranchIds, hasAnyPermission } from "@/modules/auth/services/authorization.service";
import { listBranches } from "@/modules/branches/services/branch.service";
import { prisma } from "@/db/client";
import { AdminHeader } from "@/components/AdminHeader";

export default async function AdminDashboardPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  const branchAccess = await getAccessibleBranchIds(profile, "branches", "read");
  const branches = await listBranches(branchAccess === "ALL" ? {} : { branchIds: branchAccess });

  const userRoles = await prisma.userRole.findMany({
    where: { userId: session.user.id },
    include: { role: true, branch: true },
  });

  const canUsePos = hasAnyPermission(profile, "orders", "create");
  const canUseKitchen = hasAnyPermission(profile, "kitchen", "read");
  const canUseDeliveryBoard = hasAnyPermission(profile, "delivery", "assign");
  const canUseRiderApp = hasAnyPermission(profile, "delivery", "update") && !canUseDeliveryBoard;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <AdminHeader />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <section className="mb-8 rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400">Signed in as</h2>
          <p className="mt-1 text-lg font-medium text-stone-900 dark:text-stone-50">
            {session.user.name ?? session.user.email}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {userRoles.map((ur) => (
              <span
                key={ur.id}
                className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-800 dark:bg-orange-950 dark:text-orange-300"
              >
                {ur.role.name}
                {ur.branch ? ` · ${ur.branch.name}` : " · All branches"}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400">
            Branches you can access ({branches.length})
          </h2>
          <ul className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
            {branches.map((branch) => (
              <li key={branch.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-50">{branch.name}</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">{branch.address}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {branch.status}
                </span>
              </li>
            ))}
            {branches.length === 0 && (
              <li className="py-3 text-sm text-stone-500 dark:text-stone-400">No branches assigned yet.</li>
            )}
          </ul>
        </section>

        {(canUsePos || canUseKitchen || canUseDeliveryBoard || canUseRiderApp) && (
          <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="mb-4 text-sm font-semibold text-stone-500 dark:text-stone-400">Operations</h2>
            <div className="flex flex-wrap gap-3">
              {canUsePos && (
                <Link
                  href="/pos"
                  className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
                >
                  Open POS
                </Link>
              )}
              {canUseKitchen && (
                <Link
                  href="/kitchen"
                  className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  Open Kitchen Display
                </Link>
              )}
              {canUseDeliveryBoard && (
                <Link
                  href="/admin/delivery"
                  className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  Delivery board
                </Link>
              )}
              {canUseRiderApp && (
                <Link
                  href="/rider"
                  className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  Open Rider App
                </Link>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
