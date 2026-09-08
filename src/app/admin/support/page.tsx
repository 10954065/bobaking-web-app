import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/db/client";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, getAccessibleBranchIds } from "@/modules/auth/services/authorization.service";
import { listTicketsForBranches } from "@/modules/support/services/support-ticket.service";
import { listReviews } from "@/modules/reviews/services/review.service";

export default async function SupportHomePage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  const canViewTickets = hasAnyPermission(profile, "support", "read");
  const canViewReviews = hasAnyPermission(profile, "reviews", "read");
  const canViewNotifications = hasAnyPermission(profile, "notifications", "read");

  if (!canViewTickets && !canViewReviews && !canViewNotifications) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view support.</p>
        </main>
      </div>
    );
  }

  const ticketBranchIds = getAccessibleBranchIds(profile, "support", "read");
  const [openTickets, reviews, notificationCount] = await Promise.all([
    canViewTickets ? listTicketsForBranches(ticketBranchIds, { status: "OPEN" }) : [],
    canViewReviews ? listReviews("ALL") : [],
    canViewNotifications ? prisma.notification.count() : 0,
  ]);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Support</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">Tickets, reviews, and the customer notification log.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {canViewTickets && (
            <Link
              href="/admin/support/tickets"
              className="rounded-xl border border-stone-200 bg-white p-6 transition-colors hover:border-brand-red-400 dark:border-stone-800 dark:bg-stone-900"
            >
              <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Open tickets</p>
              <p className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-50">{openTickets.length}</p>
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Customer questions and complaints</p>
            </Link>
          )}
          {canViewReviews && (
            <Link
              href="/admin/support/reviews"
              className="rounded-xl border border-stone-200 bg-white p-6 transition-colors hover:border-brand-red-400 dark:border-stone-800 dark:bg-stone-900"
            >
              <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Reviews</p>
              <p className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-50">{reviews.length}</p>
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Order ratings and comments</p>
            </Link>
          )}
          {canViewNotifications && (
            <Link
              href="/admin/support/notifications"
              className="rounded-xl border border-stone-200 bg-white p-6 transition-colors hover:border-brand-red-400 dark:border-stone-800 dark:bg-stone-900"
            >
              <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Notifications sent</p>
              <p className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-50">{notificationCount}</p>
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Order-status messages to customers</p>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
