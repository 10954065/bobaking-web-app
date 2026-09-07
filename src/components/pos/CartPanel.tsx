"use client";

import type { PosCart } from "@/modules/pos/services/pos-catalog.service";
import type { PosCustomer } from "@/components/pos/CustomerPanel";

export function CartPanel({
  cart,
  customer,
  onIncrement,
  onDecrement,
  onRemove,
  onCheckout,
  isBusy,
}: {
  cart: PosCart | null;
  customer: PosCustomer;
  onIncrement: (cartItemId: string, quantity: number) => void;
  onDecrement: (cartItemId: string, quantity: number) => void;
  onRemove: (cartItemId: string) => void;
  onCheckout: () => void;
  isBusy: boolean;
}) {
  const items = cart?.items ?? [];

  return (
    <div className="flex h-full flex-col border-l border-stone-800 bg-stone-900/40">
      <div className="border-b border-stone-800 p-4">
        <p className="text-xs uppercase tracking-wide text-stone-500">Customer</p>
        <p className="font-medium text-stone-100">
          {customer.firstName} {customer.lastName}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 && <p className="text-sm text-stone-500">No items yet — tap a product to add it.</p>}
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-stone-800 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-stone-100">{item.productName}</p>
                  {item.modifiers.length > 0 && (
                    <p className="text-xs text-stone-500">{item.modifiers.map((m) => m.name).join(", ")}</p>
                  )}
                  {item.notes && <p className="text-xs italic text-amber-400">{item.notes}</p>}
                </div>
                <span className="whitespace-nowrap text-sm font-semibold text-orange-500">GHS {item.lineTotal.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onDecrement(item.id, item.quantity)}
                    className="h-6 w-6 rounded bg-stone-800 text-xs text-stone-100 hover:bg-stone-700"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm text-stone-200">{item.quantity}</span>
                  <button
                    onClick={() => onIncrement(item.id, item.quantity)}
                    className="h-6 w-6 rounded bg-stone-800 text-xs text-stone-100 hover:bg-stone-700"
                  >
                    +
                  </button>
                </div>
                <button onClick={() => onRemove(item.id)} className="text-xs font-medium text-red-500 hover:text-red-400">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-stone-800 p-4">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-stone-400">Subtotal</span>
          <span className="font-semibold text-stone-100">GHS {(cart?.subtotal ?? 0).toFixed(2)}</span>
        </div>
        <button
          onClick={onCheckout}
          disabled={items.length === 0 || isBusy}
          className="w-full rounded-lg bg-orange-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-500 disabled:opacity-50"
        >
          {isBusy ? "Working…" : "Checkout"}
        </button>
      </div>
    </div>
  );
}
