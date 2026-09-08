import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasPermission } from "@/modules/auth/services/authorization.service";
import { getTicketById } from "@/modules/support/services/support-ticket.service";
import { replyToTicketAction, updateTicketStatusAction } from "@/modules/support/actions/support.actions";
import type { SupportTicketStatus } from "@prisma/client";

const STATUS_COLORS: Record<SupportTicketStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  RESOLVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  CLOSED: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
};

async function replyFormAction(ticketId: string, formData: FormData) {
  "use server";
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await replyToTicketAction(ticketId, body);
}

async function statusFormAction(ticketId: string, status: SupportTicketStatus) {
  "use server";
  await updateTicketStatusAction(ticketId, status);
}

export default async function SupportTicketDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const { ticketId } = await params;
  const ticket = await getTicketById(ticketId);
  if (!ticket) notFound();

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasPermission(profile, "support", "read", ticket.branchId)) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
        <main className="mx-auto max-w-3xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view this ticket.</p>
        </main>
      </div>
    );
  }
  const canReply = hasPermission(profile, "support", "update", ticket.branchId);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">{ticket.subject}</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {ticket.customer.firstName} {ticket.customer.lastName}
              {ticket.order && ` · Order ${ticket.order.orderNumber}`}
              {ticket.branch && ` · ${ticket.branch.name}`}
            </p>
          </div>
          <Link
            href="/admin/support/tickets"
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Back to tickets
          </Link>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[ticket.status]}`}>
            {ticket.status.replaceAll("_", " ")}
          </span>
          {canReply && (
            <div className="flex gap-2">
              {ticket.status !== "RESOLVED" && (
                <form action={statusFormAction.bind(null, ticket.id, "RESOLVED")}>
                  <button type="submit" className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                    Mark resolved
                  </button>
                </form>
              )}
              {ticket.status !== "CLOSED" && (
                <form action={statusFormAction.bind(null, ticket.id, "CLOSED")}>
                  <button type="submit" className="text-xs font-medium text-stone-500 hover:underline dark:text-stone-400">
                    Close
                  </button>
                </form>
              )}
              {(ticket.status === "RESOLVED" || ticket.status === "CLOSED") && (
                <form action={statusFormAction.bind(null, ticket.id, "OPEN")}>
                  <button type="submit" className="text-xs font-medium text-amber-600 hover:underline dark:text-amber-400">
                    Reopen
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <section className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <ul className="space-y-4">
            {ticket.messages.map((message) => (
              <li
                key={message.id}
                className={`rounded-lg p-3 text-sm ${
                  message.authorType === "STAFF"
                    ? "bg-orange-50 dark:bg-orange-950/40"
                    : "bg-stone-50 dark:bg-stone-800/60"
                }`}
              >
                <p className="mb-1 text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">
                  {message.authorType === "STAFF"
                    ? `Support team${message.authorUser ? ` · ${message.authorUser.firstName}` : ""}`
                    : "Customer"}
                  <span className="ml-2 font-normal normal-case text-stone-400 dark:text-stone-500">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </p>
                <p className="text-stone-800 dark:text-stone-200">{message.body}</p>
              </li>
            ))}
          </ul>

          {canReply && (
            <form action={replyFormAction.bind(null, ticket.id)} className="mt-6 flex flex-col gap-3">
              <textarea
                name="body"
                required
                rows={3}
                placeholder="Reply to the customer..."
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              />
              <button
                type="submit"
                className="self-end rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
              >
                Send reply
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
