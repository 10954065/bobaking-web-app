import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, getAccessibleBranchIds } from "@/modules/auth/services/authorization.service";
import { listBranches } from "@/modules/branches/services/branch.service";
import { listSuppliers } from "@/modules/inventory/services/supplier.service";
import { listIngredients } from "@/modules/inventory/services/ingredient.service";
import { listPurchaseOrders } from "@/modules/inventory/services/purchase-order.service";
import { NewPurchaseOrderForm } from "@/components/inventory/NewPurchaseOrderForm";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  SUBMITTED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  PARTIALLY_RECEIVED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  RECEIVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELLED: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-500",
};

export default async function PurchaseOrdersPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "purchase_orders", "read")) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            You don&apos;t have permission to view purchase orders.
          </p>
        </main>
      </div>
    );
  }

  const accessibleBranchIds = getAccessibleBranchIds(profile, "purchase_orders", "read");
  const [branches, purchaseOrders] = await Promise.all([
    listBranches(accessibleBranchIds === "ALL" ? {} : { branchIds: accessibleBranchIds }),
    listPurchaseOrders(accessibleBranchIds),
  ]);

  const canCreate = hasAnyPermission(profile, "purchase_orders", "create");
  const [suppliers, ingredients] = canCreate
    ? await Promise.all([listSuppliers(), listIngredients()])
    : [[], []];

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Purchase Orders</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">Restocking orders placed with suppliers.</p>
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
            Orders ({purchaseOrders.length})
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
                <tr>
                  <th className="px-6 py-2 font-medium">PO Number</th>
                  <th className="px-6 py-2 font-medium">Branch</th>
                  <th className="px-6 py-2 font-medium">Supplier</th>
                  <th className="px-6 py-2 font-medium">Lines</th>
                  <th className="px-6 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {purchaseOrders.map((po) => (
                  <tr key={po.id}>
                    <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">
                      <Link href={`/admin/inventory/purchase-orders/${po.id}`} className="hover:text-brand-red-600">
                        {po.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{po.branch.name}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{po.supplier.name}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{po.items.length}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[po.status] ?? ""}`}>
                        {po.status.replaceAll("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
                {purchaseOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                      No purchase orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {canCreate && (
          <NewPurchaseOrderForm
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
            ingredients={ingredients.map((i) => ({ id: i.id, name: i.name, unit: i.unit }))}
          />
        )}
      </main>
    </div>
  );
}
