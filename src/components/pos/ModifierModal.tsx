"use client";

import { useMemo, useState } from "react";
import type { PosProduct } from "@/modules/pos/services/pos-catalog.service";

export interface ModifierSelection {
  productId: string;
  quantity: number;
  notes: string;
  modifierOptionIds: string[];
}

export function ModifierModal({
  product,
  onCancel,
  onConfirm,
}: {
  product: PosProduct;
  onCancel: () => void;
  onConfirm: (selection: ModifierSelection) => void;
}) {
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
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-stone-800 bg-stone-900 p-6">
        <h2 className="text-lg font-semibold text-stone-50">{product.name}</h2>
        <p className="mt-1 text-sm text-stone-400">GHS {product.price.toFixed(2)}</p>

        {product.modifierGroups.map((group) => (
          <div key={group.id} className="mt-5">
            <h3 className="text-sm font-semibold text-stone-200">
              {group.name}
              {group.isRequired && <span className="ml-1 text-orange-500">*</span>}
            </h3>
            <div className="mt-2 space-y-1.5">
              {group.options.map((option) => {
                const isSelected = (selectedByGroup[group.id] ?? []).includes(option.id);
                return (
                  <button
                    key={option.id}
                    onClick={() => toggleOption(group.id, option.id, group.selectionType)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      isSelected ? "border-orange-600 bg-orange-950/40 text-orange-200" : "border-stone-700 text-stone-300 hover:border-stone-600"
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
          <label className="text-sm font-semibold text-stone-200">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-orange-500"
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-8 w-8 rounded-lg bg-stone-800 text-stone-100 hover:bg-stone-700"
            >
              −
            </button>
            <span className="w-6 text-center font-medium text-stone-100">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(50, q + 1))}
              className="h-8 w-8 rounded-lg bg-stone-800 text-stone-100 hover:bg-stone-700"
            >
              +
            </button>
          </div>
          <span className="font-semibold text-orange-500">GHS {(unitPriceWithModifiers * quantity).toFixed(2)}</span>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onCancel}
            className="w-full rounded-lg border border-stone-700 py-2.5 text-sm font-medium text-stone-300 hover:bg-stone-800"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onConfirm({ productId: product.id, quantity, notes: notes.trim(), modifierOptionIds: allOptionIds })
            }
            disabled={missingRequired}
            className="w-full rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50"
          >
            Add to order
          </button>
        </div>
      </div>
    </div>
  );
}
