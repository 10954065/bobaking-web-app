import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission } from "@/modules/auth/services/authorization.service";
import { searchCustomers } from "@/modules/customers/services/customer.service";
import { AdminHeader } from "@/components/AdminHeader";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "customers", "read")) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
        <AdminHeader />
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            You don&apos;t have permission to view customers.
          </p>
        </main>
      </div>
    );
  }

  const { q } = await searchParams;
  const customers = q ? await searchCustomers(q) : [];

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <AdminHeader />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <section className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400">Customer search</h2>
          <form method="GET" className="mt-3 flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by name, email, or phone"
              className="w-full max-w-sm rounded-lg border border-stone-300 px-3.5 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
            />
            <button
              type="submit"
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
            >
              Search
            </button>
          </form>

          <ul className="mt-6 divide-y divide-stone-100 dark:divide-stone-800">
            {customers.map((customer) => (
              <li key={customer.id}>
                <Link
                  href={`/admin/customers/${customer.id}`}
                  className="flex items-center justify-between py-3 transition-colors hover:text-orange-600"
                >
                  <div>
                    <p className="font-medium text-stone-900 dark:text-stone-50">
                      {customer.firstName} {customer.lastName}
                    </p>
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                      {customer.email ?? "—"} · {customer.phone ?? "—"}
                    </p>
                  </div>
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                    {customer.status}
                  </span>
                </Link>
              </li>
            ))}
            {q && customers.length === 0 && (
              <li className="py-3 text-sm text-stone-500 dark:text-stone-400">No customers found for &quot;{q}&quot;.</li>
            )}
            {!q && <li className="py-3 text-sm text-stone-500 dark:text-stone-400">Search to see results.</li>}
          </ul>
        </section>
      </main>
    </div>
  );
}
