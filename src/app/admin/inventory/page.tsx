import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, getAccessibleBranchIds } from "@/modules/auth/services/authorization.service";
import { listBranches } from "@/modules/branches/services/branch.service";
import { listBranchStockView } from "@/modules/inventory/services/stock.service";
import { createIngredientFormAction, adjustStockFormAction } from "./actions";

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "inventory", "read")) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view inventory.</p>
        </main>
      </div>
    );
  }

  const accessibleBranchIds = getAccessibleBranchIds(profile, "inventory", "read");
  const branches = await listBranches(accessibleBranchIds === "ALL" ? {} : { branchIds: accessibleBranchIds });

  const { branch: branchParam } = await searchParams;
  const branchId = branchParam ?? branches[0]?.id;
  const currentBranch = branches.find((b) => b.id === branchId);

  if (!branchId || !currentBranch) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">No branch access configured for inventory.</p>
        </main>
      </div>
    );
  }

  const canAdjust = hasAnyPermission(profile, "inventory", "adjust");
  const stock = await listBranchStockView(branchId);
  const lowStock = stock.filter((row) => row.isLowStock);

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Inventory</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">Ingredient stock on hand, per branch.</p>
          </div>
          <nav className="flex gap-2">
            <Link
              href="/admin/inventory/suppliers"
              className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Suppliers
            </Link>
            <Link
              href="/admin/inventory/purchase-orders"
              className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Purchase Orders
            </Link>
          </nav>
        </div>

        {branches.length > 1 && (
          <div className="mb-4 flex gap-1">
            {branches.map((b) => (
              <Link
                key={b.id}
                href={`/admin/inventory?branch=${b.id}`}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  b.id === branchId
                    ? "bg-brand-red-600 text-white"
                    : "bg-white text-stone-600 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800"
                }`}
              >
                {b.name}
              </Link>
            ))}
          </div>
        )}

        {lowStock.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <strong>{lowStock.length}</strong> ingredient{lowStock.length === 1 ? "" : "s"} at or below reorder level at{" "}
            {currentBranch.name}: {lowStock.map((row) => row.name).join(", ")}
          </div>
        )}

        <section className="mb-8 rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-stone-900/5 transition-shadow duration-200 hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
          <h3 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">
            Stock on hand &middot; {currentBranch.name} ({stock.length})
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
                <tr>
                  <th className="px-6 py-2 font-medium">Ingredient</th>
                  <th className="px-6 py-2 font-medium">SKU</th>
                  <th className="px-6 py-2 font-medium">On hand</th>
                  <th className="px-6 py-2 font-medium">Reorder level</th>
                  <th className="px-6 py-2 font-medium">Status</th>
                  {canAdjust && <th className="px-6 py-2 font-medium">Adjust</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {stock.map((row) => (
                  <tr key={row.ingredientId}>
                    <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">{row.name}</td>
                    <td className="px-6 py-3 text-stone-500 dark:text-stone-400">{row.sku}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                      {row.quantityOnHand.toFixed(2)} {row.unit}
                    </td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                      {row.reorderLevel.toFixed(2)} {row.unit}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          row.isLowStock
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        {row.isLowStock ? "Low stock" : "OK"}
                      </span>
                    </td>
                    {canAdjust && (
                      <td className="px-6 py-3">
                        <form
                          action={adjustStockFormAction.bind(null, branchId, row.ingredientId)}
                          className="flex items-center gap-1.5"
                        >
                          <input
                            type="number"
                            name="quantityDelta"
                            step="0.01"
                            required
                            placeholder="±qty"
                            className="w-20 rounded-lg border border-stone-300 px-2 py-1.5 text-xs outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                          />
                          <input
                            type="text"
                            name="reason"
                            required
                            placeholder="Reason"
                            className="w-28 rounded-lg border border-stone-300 px-2 py-1.5 text-xs outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                          />
                          <button
                            type="submit"
                            className="rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-stone-700 dark:bg-brand-red-600 dark:hover:bg-brand-red-500"
                          >
                            Apply
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
                {stock.length === 0 && (
                  <tr>
                    <td colSpan={canAdjust ? 6 : 5} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                      No ingredients in the catalog yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {canAdjust && (
          <section className="rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-stone-900/5 transition-shadow duration-200 hover:shadow-md p-6 dark:border-stone-800 dark:bg-stone-900">
            <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">Add ingredient</h3>
            <form action={createIngredientFormAction} className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="mt-1 w-48 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">SKU</label>
                <input
                  type="text"
                  name="sku"
                  required
                  className="mt-1 w-36 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Unit</label>
                <input
                  type="text"
                  name="unit"
                  required
                  placeholder="kg, l, pcs"
                  className="mt-1 w-24 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Reorder level</label>
                <input
                  type="number"
                  name="reorderLevel"
                  step="0.01"
                  min={0}
                  defaultValue={0}
                  className="mt-1 w-28 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-brand-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red-500"
              >
                Add ingredient
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
