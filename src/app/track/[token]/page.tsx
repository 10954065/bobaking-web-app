import { Clock, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { getPublicOrderTracking } from "@/modules/orders/services/order-tracking.service";
import { getTicketForOrder } from "@/modules/support/services/support-ticket.service";
import { getReviewForOrder } from "@/modules/reviews/services/review.service";
import { CustomerLiveMap } from "@/components/tracking/CustomerLiveMap";
import { LogoLockup } from "@/components/brand/Logo";
import { createSupportTicketFormAction, addTicketMessageFormAction, submitReviewFormAction } from "./actions";

const REVIEWABLE_STATUSES = new Set(["DELIVERED", "COMPLETED"]);

// CONFIRMED means payment landed — nothing more. Labeled distinctly from
// ACCEPTED (the branch's own decision) so a customer never reads "payment
// went through" as "the branch is making my food".
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Order started",
  PENDING_PAYMENT: "Awaiting payment",
  PAYMENT_FAILED: "Payment failed",
  CONFIRMED: "Payment received",
  ACCEPTED: "Order accepted",
  SENT_TO_KITCHEN: "Sent to kitchen",
  PREPARING: "Being prepared",
  READY: "Ready",
  ASSIGNED_TO_RIDER: "Rider assigned",
  PICKED_UP: "Picked up by rider",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  REJECTED: "Not accepted",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

function statusPillClass(status: string): string {
  if (status === "CONFIRMED") return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  if (status === "REJECTED" || status === "CANCELLED" || status === "PAYMENT_FAILED")
    return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
  if (status === "DELIVERED" || status === "COMPLETED")
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  return "bg-brand-red/10 text-brand-red dark:bg-brand-red/15 dark:text-brand-red-light";
}

const inputClass =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100";

export default async function TrackOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const tracking = await getPublicOrderTracking(token);
  if (!tracking) notFound();

  const [ticket, reviewState] = await Promise.all([
    getTicketForOrder(tracking.orderNumber),
    getReviewForOrder(tracking.orderNumber),
  ]);

  const canReview = reviewState ? REVIEWABLE_STATUSES.has(reviewState.orderStatus) : false;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <header className="border-b border-stone-200 bg-brand-ink px-6 py-4 dark:border-stone-800">
        <LogoLockup size={36} />
        <h1 className="mt-3 font-display text-lg uppercase tracking-wide text-brand-cream">Track your order</h1>
      </header>

      <main className="mx-auto max-w-lg px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <section className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-50">{tracking.orderNumber}</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusPillClass(tracking.status)}`}>
              {statusLabel(tracking.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {tracking.branchName} · {tracking.type.replaceAll("_", " ")}
          </p>

          {tracking.status === "CONFIRMED" && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-3 dark:border-amber-900/60 dark:bg-amber-950/30">
              <Clock size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <span className="font-semibold">Payment received — not yet accepted.</span> {tracking.branchName}{" "}
                still needs to confirm this order. Refresh this page to check for updates.
              </p>
            </div>
          )}

          {tracking.status === "REJECTED" && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-300 bg-red-50 px-3.5 py-3 dark:border-red-900/60 dark:bg-red-950/30">
              <XCircle size={16} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-300">
                <span className="font-semibold">{tracking.branchName} wasn&apos;t able to accept this order.</span>{" "}
                Any payment will be refunded. Contact support below if you need help.
              </p>
            </div>
          )}

          <ul className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
            {tracking.items.map((item, index) => (
              <li key={index} className="flex justify-between py-2 text-sm text-stone-700 dark:text-stone-300">
                <span>
                  {item.quantity} × {item.productName}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-stone-100 pt-3 text-sm font-semibold text-stone-900 dark:border-stone-800 dark:text-stone-50">
            <span>Total</span>
            <span>GHS {tracking.total.toFixed(2)}</span>
          </div>

          {tracking.isLiveTrackable && (
            <div className="mt-4">
              <CustomerLiveMap
                orderId={tracking.orderId}
                trackingToken={token}
                branchCoordinates={tracking.branchCoordinates}
                customerCoordinates={tracking.customerCoordinates}
                riderFirstName={tracking.rider?.firstName ?? null}
              />
            </div>
          )}

          {tracking.deliveryCode && (
            <div className="mt-4 rounded-lg border border-brand-cyan/30 bg-brand-cyan/5 px-4 py-3 text-center dark:border-brand-cyan/30 dark:bg-brand-cyan/10">
              <p className="text-xs font-medium text-brand-cyan dark:text-brand-cyan">
                Give this code to your rider when they arrive
              </p>
              <p className="mt-1 font-mono text-3xl font-bold tracking-[0.4em] text-brand-red dark:text-brand-red-light">
                {tracking.deliveryCode}
              </p>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">Timeline</h3>
          <ol className="mt-4 space-y-3">
            {tracking.statusHistory.map((entry, index) => (
              <li key={index} className="flex items-center gap-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-brand-red" />
                <span className="text-sm text-stone-700 dark:text-stone-300">{statusLabel(entry.toStatus)}</span>
                <span className="ml-auto text-xs text-stone-400 dark:text-stone-500">
                  {new Date(entry.createdAt).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {canReview && (
          <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
            <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">
              {reviewState?.review ? "Your review" : "Rate your order"}
            </h3>
            {reviewState?.review ? (
              <div className="mt-3">
                <p className="text-lg text-amber-500">
                  {"★".repeat(reviewState.review.rating)}
                  <span className="text-stone-300 dark:text-stone-700">{"★".repeat(5 - reviewState.review.rating)}</span>
                </p>
                {reviewState.review.comment && (
                  <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">{reviewState.review.comment}</p>
                )}
              </div>
            ) : (
              <form action={submitReviewFormAction.bind(null, token, tracking.orderNumber)} className="mt-3 space-y-3">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <label key={value} className="cursor-pointer text-2xl text-stone-300 has-[:checked]:text-amber-500 dark:text-stone-700">
                      <input type="radio" name="rating" value={value} required className="sr-only" />★
                    </label>
                  ))}
                </div>
                <textarea name="comment" rows={2} placeholder="Tell us about your experience (optional)" className={inputClass} />
                <button
                  type="submit"
                  className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-red/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Submit review
                </button>
              </form>
            )}
          </section>
        )}

        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">
            {ticket ? "Support" : "Need help with this order?"}
          </h3>

          {ticket ? (
            <div className="mt-3">
              <span
                className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                  ticket.status === "OPEN" || ticket.status === "IN_PROGRESS"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                }`}
              >
                {ticket.status.replaceAll("_", " ")}
              </span>
              <ul className="mt-3 space-y-2">
                {ticket.messages.map((message) => (
                  <li
                    key={message.id}
                    className={`rounded-lg p-2 text-sm ${
                      message.authorType === "STAFF" ? "bg-brand-red/5 dark:bg-brand-red/10" : "bg-stone-50 dark:bg-stone-800/60"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">
                      {message.authorType === "STAFF" ? "Support team" : "You"}
                    </p>
                    <p className="text-stone-800 dark:text-stone-200">{message.body}</p>
                  </li>
                ))}
              </ul>
              <form action={addTicketMessageFormAction.bind(null, token, ticket.id)} className="mt-3 flex flex-col gap-2">
                <textarea name="body" rows={2} required placeholder="Add a message..." className={inputClass} />
                <button
                  type="submit"
                  className="self-end rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  Send
                </button>
              </form>
            </div>
          ) : (
            <form action={createSupportTicketFormAction.bind(null, token, tracking.orderNumber)} className="mt-3 space-y-3">
              <input type="text" name="subject" required placeholder="What's this about?" className={inputClass} />
              <textarea name="message" rows={3} required placeholder="Describe the issue..." className={inputClass} />
              <button
                type="submit"
                className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
              >
                Contact support
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
