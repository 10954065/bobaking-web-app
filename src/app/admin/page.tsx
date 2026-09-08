import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, ShoppingBag, ChefHat, Truck, Bike, ArrowUpRight } from "lucide-react";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, getAccessibleBranchIds, hasAnyPermission } from "@/modules/auth/services/authorization.service";
import { listBranches } from "@/modules/branches/services/branch.service";
import { prisma } from "@/db/client";

interface OperationsAccess {
  canUsePos: boolean;
  canUseKitchen: boolean;
  canUseDeliveryBoard: boolean;
  canUseRiderApp: boolean;
}

const OPERATIONS_LINKS: {
  key: string;
  href: string;
  label: string;
  icon: typeof ShoppingBag;
  isVisible: (access: OperationsAccess) => boolean;
}[] = [
  { key: "pos", href: "/pos", label: "Open POS", icon: ShoppingBag, isVisible: (a) => a.canUsePos },
  { key: "kitchen", href: "/kitchen", label: "Kitchen display", icon: ChefHat, isVisible: (a) => a.canUseKitchen },
  { key: "delivery", href: "/admin/delivery", label: "Delivery board", icon: Truck, isVisible: (a) => a.canUseDeliveryBoard },
  { key: "rider", href: "/rider", label: "Rider app", icon: Bike, isVisible: (a) => a.canUseRiderApp },
];

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

  const access: OperationsAccess = {
    canUsePos: hasAnyPermission(profile, "orders", "create"),
    canUseKitchen: hasAnyPermission(profile, "kitchen", "read"),
    canUseDeliveryBoard: hasAnyPermission(profile, "delivery", "assign"),
    canUseRiderApp: hasAnyPermission(profile, "delivery", "update") && !hasAnyPermission(profile, "delivery", "assign"),
  };
  const operations = OPERATIONS_LINKS.filter((op) => op.isVisible(access));

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
      <section className="mb-8">
        <p className="text-sm text-stone-500 dark:text-stone-400">Welcome back,</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900 dark:text-stone-50">
          {session.user.name ?? session.user.email}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {userRoles.map((ur) => (
            <span
              key={ur.id}
              className="rounded-full bg-brand-red-100 px-3 py-1 text-xs font-medium text-brand-red-800 dark:bg-brand-red-950 dark:text-brand-red-300"
            >
              {ur.role.name.split("_").join(" ")}
              {ur.branch ? ` · ${ur.branch.name}` : " · All branches"}
            </span>
          ))}
        </div>
      </section>

      {operations.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-stone-500 dark:text-stone-400">Quick launch</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {operations.map((op) => {
              const Icon = op.icon;
              return (
                <Link
                  key={op.key}
                  href={op.href}
                  className="group flex flex-col gap-3 rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-stone-900/5 transition-shadow duration-200 hover:shadow-md p-4 transition-all hover:-translate-y-0.5 hover:border-brand-red-300 hover:shadow-lg hover:shadow-brand-red-900/5 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-brand-red-900"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-brand-red-50 text-brand-red-600 dark:bg-brand-red-950 dark:text-brand-red-400">
                    <Icon size={18} />
                  </span>
                  <span className="flex items-center justify-between text-sm font-semibold text-stone-800 dark:text-stone-100">
                    {op.label}
                    <ArrowUpRight
                      size={15}
                      className="text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-red-500 dark:text-stone-600"
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-stone-900/5 transition-shadow duration-200 hover:shadow-md p-6 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400">
          Branches you can access ({branches.length})
        </h2>
        <ul className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
          {branches.map((branch) => (
            <li key={branch.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                  <MapPin size={16} />
                </span>
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-50">{branch.name}</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">{branch.address}</p>
                </div>
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
    </main>
  );
}
