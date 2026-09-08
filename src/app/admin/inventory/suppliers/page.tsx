import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission } from "@/modules/auth/services/authorization.service";
import { listSuppliers } from "@/modules/inventory/services/supplier.service";
import { createSupplierFormAction, toggleSupplierFormAction } from "./actions";

export default async function SuppliersPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "suppliers", "read")) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view suppliers.</p>
        </main>
      </div>
    );
  }

  const canManage = hasAnyPermission(profile, "suppliers", "update");
  const suppliers = await listSuppliers({ includeInactive: true });

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Suppliers</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">Vendors purchase orders are placed against.</p>
          </div>
          <Link
            href="/admin/inventory"
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Back to inventory
          </Link>
        </div>

        <section className="mb-8 rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-stone-900/5 transition-shadow duration-200 hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
          <h3 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">
            Suppliers ({suppliers.length})
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
                <tr>
                  <th className="px-6 py-2 font-medium">Name</th>
                  <th className="px-6 py-2 font-medium">Phone</th>
                  <th className="px-6 py-2 font-medium">Email</th>
                  <th className="px-6 py-2 font-medium">Status</th>
                  {canManage && <th className="px-6 py-2 font-medium"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">{supplier.name}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{supplier.phone ?? "N/A"}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{supplier.email ?? "N/A"}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          supplier.isActive
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-500"
                        }`}
                      >
                        {supplier.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-6 py-3 text-right">
                        {supplier.isActive && (
                          <form action={toggleSupplierFormAction.bind(null, supplier.id)}>
                            <button
                              type="submit"
                              className="text-xs font-medium text-stone-500 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400"
                            >
                              Deactivate
                            </button>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 5 : 4} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                      No suppliers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {canManage && (
          <section className="rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-stone-900/5 transition-shadow duration-200 hover:shadow-md p-6 dark:border-stone-800 dark:bg-stone-900">
            <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">Add supplier</h3>
            <form action={createSupplierFormAction} className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="mt-1 w-56 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Phone</label>
                <input
                  type="text"
                  name="phone"
                  className="mt-1 w-40 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Email</label>
                <input
                  type="email"
                  name="email"
                  className="mt-1 w-56 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Address</label>
                <input
                  type="text"
                  name="address"
                  className="mt-1 w-56 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-brand-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red-500"
              >
                Add supplier
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
