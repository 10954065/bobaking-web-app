import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasPermission } from "@/modules/auth/services/authorization.service";
import { getPurchaseOrderById } from "@/modules/inventory/services/purchase-order.service";
import { ReceivePurchaseOrderForm } from "@/components/inventory/ReceivePurchaseOrderForm";
import { SubmitPurchaseOrderButton } from "@/components/inventory/SubmitPurchaseOrderButton";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  SUBMITTED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  PARTIALLY_RECEIVED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  RECEIVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELLED: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-500",
};

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const po = await getPurchaseOrderById(id);
  if (!po) notFound();

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasPermission(profile, "purchase_orders", "read", po.branchId)) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            You don&apos;t have permission to view this purchase order.
          </p>
        </main>
      </div>
    );
  }

  const canUpdate = hasPermission(profile, "purchase_orders", "update", po.branchId);
  const canReceive = canUpdate && (po.status === "SUBMITTED" || po.status === "PARTIALLY_RECEIVED");
  const canSubmit = canUpdate && po.status === "DRAFT";

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">{po.orderNumber}</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {po.branch.name} · {po.supplier.name}
            </p>
          </div>
          <Link
            href="/admin/inventory/purchase-orders"
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Back to purchase orders
          </Link>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[po.status] ?? ""}`}>
            {po.status.replaceAll("_", " ")}
          </span>
          {po.notes && <p className="text-sm text-stone-500 dark:text-stone-400">{po.notes}</p>}
          {canSubmit && <SubmitPurchaseOrderButton purchaseOrderId={po.id} />}
        </div>

        <section className="mb-8 rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <h3 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">Line items</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
                <tr>
                  <th className="px-6 py-2 font-medium">Ingredient</th>
                  <th className="px-6 py-2 font-medium">Ordered</th>
                  <th className="px-6 py-2 font-medium">Received</th>
                  <th className="px-6 py-2 font-medium">Unit cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {po.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">{item.ingredient.name}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                      {Number(item.quantityOrdered).toFixed(2)} {item.ingredient.unit}
                    </td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                      {Number(item.quantityReceived).toFixed(2)} {item.ingredient.unit}
                    </td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                      GHS {Number(item.unitCost).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {canReceive && (
          <ReceivePurchaseOrderForm
            purchaseOrderId={po.id}
            items={po.items.map((item) => ({
              id: item.id,
              ingredientName: item.ingredient.name,
              unit: item.ingredient.unit,
              quantityOrdered: Number(item.quantityOrdered),
              quantityReceived: Number(item.quantityReceived),
            }))}
          />
        )}
      </main>
    </div>
  );
}
