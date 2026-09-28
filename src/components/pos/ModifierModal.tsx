"use client";

import { useMemo, useState } from "react";
import { MenuImage } from "@/components/menu/MenuImage";
import type { PosProduct } from "@/modules/pos/services/pos-catalog.service";

export interface ModifierSelection {
  productId: string;
  quantity: number;
  notes: string;
  modifierOptionIds: string[];
}

/** See ProductGrid's `variant` doc — same dark-POS/light-storefront split. */
export function ModifierModal({
  product,
  onCancel,
  onConfirm,
  variant = "dark",
}: {
  product: PosProduct;
  onCancel: () => void;
  onConfirm: (selection: ModifierSelection) => void;
  variant?: "dark" | "light";
}) {
  const light = variant === "light";
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>({});

  function toggleOption(groupId: string, optionId: string, selectionType: "SINGLE" | "MULTIPLE") {
    setSelectedByGroup((prev) => {
      const current = prev[groupId] ?? [];
      if (selectionType === "SINGLE") {
        return { ...prev, [groupId]: current.includes(optionId) ? [] : [optionId] };
      }
      return {
        ...prev,
        [groupId]: current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId],
      };
    });
  }

  const allOptionIds = Object.values(selectedByGroup).flat();

  const missingRequired = useMemo(
    () =>
      product.modifierGroups.some((g) => g.isRequired && (selectedByGroup[g.id]?.length ?? 0) < Math.max(1, g.minSelect)),
    [product.modifierGroups, selectedByGroup]
  );

  const unitPriceWithModifiers =
    product.price +
    allOptionIds.reduce((sum, optionId) => {
      const option = product.modifierGroups.flatMap((g) => g.options).find((o) => o.id === optionId);
      return sum + (option?.priceDelta ?? 0);
    }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border p-6 ${
          light ? "border-brand-ink/10 bg-white" : "border-stone-800 bg-stone-900"
        }`}
      >
        <MenuImage src={product.imageUrl} alt={product.name} className="mb-4 aspect-2/1 w-full rounded-lg" />
        <h2 className={`text-lg font-semibold ${light ? "text-brand-ink" : "text-stone-50"}`}>{product.name}</h2>
        <p className={`mt-1 text-sm ${light ? "text-brand-ink/55" : "text-stone-400"}`}>GHS {product.price.toFixed(2)}</p>

        {product.modifierGroups.map((group) => (
          <div key={group.id} className="mt-5">
            <h3 className={`text-sm font-semibold ${light ? "text-brand-ink/80" : "text-stone-200"}`}>
              {group.name}
              {group.isRequired && <span className={`ml-1 ${light ? "text-brand-red" : "text-brand-red-light"}`}>*</span>}
            </h3>
            <div className="mt-2 space-y-1.5">
              {group.options.map((option) => {
                const isSelected = (selectedByGroup[group.id] ?? []).includes(option.id);
                return (
                  <button
                    key={option.id}
                    onClick={() => toggleOption(group.id, option.id, group.selectionType)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? light
                          ? "border-brand-red bg-brand-red/10 text-brand-red-700"
                          : "border-brand-red bg-brand-red/10 text-brand-red-light"
                        : light
                          ? "border-brand-ink/12 text-brand-ink/70 hover:border-brand-ink/25"
                          : "border-stone-700 text-stone-300 hover:border-stone-600"
                    }`}
                  >
                    <span>{option.name}</span>
                    {option.priceDelta !== 0 && <span>+GHS {option.priceDelta.toFixed(2)}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-5">
          <label className={`text-sm font-semibold ${light ? "text-brand-ink/80" : "text-stone-200"}`}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={`mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-red ${
              light ? "border-brand-ink/12 bg-brand-cream/40 text-brand-ink" : "border-stone-700 bg-stone-950 text-stone-100"
            }`}
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className={`h-8 w-8 rounded-lg ${light ? "bg-brand-cream text-brand-ink hover:bg-brand-ink/10" : "bg-stone-800 text-stone-100 hover:bg-stone-700"}`}
            >
              −
            </button>
            <span className={`w-6 text-center font-medium ${light ? "text-brand-ink" : "text-stone-100"}`}>{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(50, q + 1))}
              className={`h-8 w-8 rounded-lg ${light ? "bg-brand-cream text-brand-ink hover:bg-brand-ink/10" : "bg-stone-800 text-stone-100 hover:bg-stone-700"}`}
            >
              +
            </button>
          </div>
          <span className={`font-semibold ${light ? "text-brand-red-700" : "text-brand-red-light"}`}>
            GHS {(unitPriceWithModifiers * quantity).toFixed(2)}
          </span>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onCancel}
            className={`w-full rounded-lg border py-2.5 text-sm font-medium ${
              light ? "border-brand-ink/12 text-brand-ink/70 hover:bg-brand-cream" : "border-stone-700 text-stone-300 hover:bg-stone-800"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onConfirm({ productId: product.id, quantity, notes: notes.trim(), modifierOptionIds: allOptionIds })
            }
            disabled={missingRequired}
            className="w-full rounded-lg bg-brand-red py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-red/20 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            Add to order
          </button>
        </div>
      </div>
    </div>
  );
}
