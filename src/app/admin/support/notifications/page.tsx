import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission } from "@/modules/auth/services/authorization.service";
import { listNotifications } from "@/modules/notifications/services/notification.service";

export default async function NotificationsLogPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "notifications", "read")) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view notifications.</p>
        </main>
      </div>
    );
  }

  const notifications = await listNotifications({ limit: 200 });
  const failedCount = notifications.filter((n) => n.status === "FAILED").length;

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Notifications</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Order status messages sent to customers via SMS/email. Real delivery once Twilio/Resend are configured,
              a dev log until then. The Status column shows what actually happened, not just what was attempted.
            </p>
          </div>
          <Link
            href="/admin/support"
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Back to support
          </Link>
        </div>

        {failedCount > 0 && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <span className="font-semibold">{failedCount}</span> notification{failedCount === 1 ? "" : "s"} failed to
            send. If this is a real provider (not the dev stand-in), check the Twilio/Resend credentials in your
            environment config.
          </div>
        )}

        <section className="rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-stone-900/5 transition-shadow duration-200 hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-stone-500 dark:text-stone-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Order</th>
                  <th className="px-6 py-3 font-medium">Channel</th>
                  <th className="px-6 py-3 font-medium">Subject</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {notifications.map((notification) => (
                  <tr key={notification.id}>
                    <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">
                      {notification.customer.firstName} {notification.customer.lastName}
                    </td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{notification.order?.orderNumber ?? "N/A"}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{notification.channel}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{notification.subject}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          notification.status === "FAILED"
                            ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        {notification.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                      {new Date(notification.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {notifications.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                      No notifications sent yet.
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
