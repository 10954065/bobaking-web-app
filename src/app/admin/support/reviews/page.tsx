import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, getAccessibleBranchIds } from "@/modules/auth/services/authorization.service";
import { listReviews } from "@/modules/reviews/services/review.service";
import { moderateReviewAction } from "@/modules/reviews/actions/review.actions";

const STARS = "★★★★★";

async function toggleStatusAction(reviewId: string, nextStatus: "PUBLISHED" | "HIDDEN") {
  "use server";
  await moderateReviewAction(reviewId, nextStatus);
}

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "reviews", "read")) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view reviews.</p>
        </main>
      </div>
    );
  }

  const canModerate = hasAnyPermission(profile, "reviews", "moderate");
  const { status } = await searchParams;
  const branchIds = getAccessibleBranchIds(profile, "reviews", "read");
  const reviews = await listReviews(branchIds, { status: status === "HIDDEN" ? "HIDDEN" : status === "PUBLISHED" ? "PUBLISHED" : undefined });

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Reviews</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">Submitted from the order tracking page after delivery.</p>
          </div>
          <Link
            href="/admin/support"
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Back to support
          </Link>
        </div>

        <div className="mb-4 flex gap-1">
          {[
            { value: undefined, label: "All" },
            { value: "PUBLISHED", label: "Published" },
            { value: "HIDDEN", label: "Hidden" },
          ].map((filter) => (
            <Link
              key={filter.label}
              href={filter.value ? `/admin/support/reviews?status=${filter.value}` : "/admin/support/reviews"}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                filter.value === status || (!filter.value && !status)
                  ? "bg-brand-red-600 text-white"
                  : "bg-white text-stone-600 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        <section className="rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {reviews.map((review) => (
              <li key={review.id} className="flex items-start justify-between gap-4 px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-amber-500">
                    {STARS.slice(0, review.rating)}
                    <span className="text-stone-300 dark:text-stone-700">{STARS.slice(review.rating)}</span>
                  </p>
                  <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">{review.comment ?? <em>No comment left.</em>}</p>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    {review.customer.firstName} {review.customer.lastName} · {review.branch.name} · Order{" "}
                    {review.order.orderNumber} · {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      review.status === "PUBLISHED"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                    }`}
                  >
                    {review.status}
                  </span>
                  {canModerate && (
                    <form action={toggleStatusAction.bind(null, review.id, review.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED")}>
                      <button type="submit" className="text-xs font-medium text-stone-500 hover:text-brand-red-600 dark:text-stone-400 dark:hover:text-brand-red-400">
                        {review.status === "PUBLISHED" ? "Hide" : "Publish"}
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
            {reviews.length === 0 && (
              <li className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">No reviews yet.</li>
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
