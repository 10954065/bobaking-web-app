"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { receivePurchaseOrderItemsAction } from "@/modules/inventory/actions/purchase-order.actions";

interface ReceivableItem {
  id: string;
  ingredientName: string;
  unit: string;
  quantityOrdered: number;
  quantityReceived: number;
}

export function ReceivePurchaseOrderForm({
  purchaseOrderId,
  items,
}: {
  purchaseOrderId: string;
  items: ReceivableItem[];
}) {
  const router = useRouter();
  const outstanding = items.filter((item) => item.quantityReceived < item.quantityOrdered);
  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(outstanding.map((item) => [item.id, String(item.quantityOrdered - item.quantityReceived)]))
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleReceive() {
    setError(null);
    const receiveItems = outstanding
      .map((item) => ({ purchaseOrderItemId: item.id, quantityReceived: Number(quantities[item.id] || 0) }))
      .filter((entry) => entry.quantityReceived > 0);

    if (receiveItems.length === 0) {
      setError("Enter a received quantity for at least one line.");
      return;
    }

    startTransition(async () => {
      try {
        await receivePurchaseOrderItemsAction(purchaseOrderId, { items: receiveItems });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to record receipt.");
      }
    });
  }

  if (outstanding.length === 0) return null;

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
      <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">Receive delivery</h3>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Enter what actually arrived — partial deliveries are fine and stock updates immediately per line.
      </p>

      <div className="mt-4 space-y-2">
        {outstanding.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <span className="w-48 text-sm font-medium text-stone-900 dark:text-stone-50">{item.ingredientName}</span>
            <span className="w-32 text-xs text-stone-500 dark:text-stone-400">
              {item.quantityReceived.toFixed(2)} / {item.quantityOrdered.toFixed(2)} {item.unit} so far
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={quantities[item.id] ?? ""}
              onChange={(e) => setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))}
              className="w-28 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
            />
            <span className="text-xs text-stone-500 dark:text-stone-400">{item.unit} received now</span>
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleReceive}
        disabled={isPending}
        className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500 disabled:opacity-50"
      >
        {isPending ? "Recording…" : "Record receipt"}
      </button>
    </section>
  );
}
