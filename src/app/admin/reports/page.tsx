import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission } from "@/modules/auth/services/authorization.service";
import { AdminHeader } from "@/components/AdminHeader";

const REPORT_CARDS = [
  {
    key: "sales",
    title: "Sales summary",
    description: "Revenue, top products, and order-type breakdown for the last 30 days.",
    href: "/api/analytics/export?range=30",
    permission: { resource: "analytics", action: "export" },
  },
  {
    key: "inventory",
    title: "Inventory valuation",
    description: "Current stock on hand valued at the most recent purchase cost, per branch.",
    href: "/api/reports/inventory-valuation/export",
    permission: { resource: "inventory", action: "read" },
  },
  {
    key: "support",
    title: "Support tickets",
    description: "Ticket volume by status over the last 30 days.",
    href: "/api/reports/support/export?range=30",
    permission: { resource: "support", action: "read" },
  },
  {
    key: "reviews",
    title: "Reviews",
    description: "Rating distribution and comments over the last 30 days.",
    href: "/api/reports/reviews/export?range=30",
    permission: { resource: "reviews", action: "read" },
  },
] as const;

export default async function ReportsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  const availableCards = REPORT_CARDS.filter((card) => hasAnyPermission(profile, card.permission.resource, card.permission.action));

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <AdminHeader />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Reports</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">Downloadable CSV reports across sales, inventory, and customer service.</p>
        </div>

        {availableCards.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view any reports.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {availableCards.map((card) => (
              <div key={card.key} className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-50">{card.title}</p>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{card.description}</p>
                <a
                  href={card.href}
                  className="mt-4 inline-block rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  Download CSV
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
