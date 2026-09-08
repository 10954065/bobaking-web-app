import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, getAccessibleBranchIds } from "@/modules/auth/services/authorization.service";
import { listTicketsForBranches } from "@/modules/support/services/support-ticket.service";
import type { SupportTicketStatus } from "@prisma/client";

const STATUS_FILTERS: { value: SupportTicketStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const STATUS_COLORS: Record<SupportTicketStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  RESOLVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  CLOSED: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
};

export default async function SupportTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "support", "read")) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view support tickets.</p>
        </main>
      </div>
    );
  }

  const { status: statusParam } = await searchParams;
  const status = STATUS_FILTERS.find((f) => f.value === statusParam)?.value;
  const branchIds = getAccessibleBranchIds(profile, "support", "read");
  const tickets = await listTicketsForBranches(branchIds, { status });

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Support tickets</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">Raised from the order tracking page.</p>
          </div>
          <Link
            href="/admin/support"
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Back to support
          </Link>
        </div>

        <div className="mb-4 flex gap-1">
          {STATUS_FILTERS.map((filter) => (
            <Link
              key={filter.label}
              href={filter.value ? `/admin/support/tickets?status=${filter.value}` : "/admin/support/tickets"}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                filter.value === status
                  ? "bg-brand-red-600 text-white"
                  : "bg-white text-stone-600 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        <section className="rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-stone-500 dark:text-stone-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Subject</th>
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Order</th>
                  <th className="px-6 py-3 font-medium">Branch</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/support/tickets/${ticket.id}`}
                        className="font-medium text-stone-900 hover:text-brand-red-600 dark:text-stone-50 dark:hover:text-brand-red-400"
                      >
                        {ticket.subject}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                      {ticket.customer.firstName} {ticket.customer.lastName}
                    </td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{ticket.order?.orderNumber ?? "—"}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{ticket.branch?.name ?? "—"}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
                        {ticket.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                      {new Date(ticket.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                      No tickets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
