"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPurchaseOrderAction } from "@/modules/inventory/actions/purchase-order.actions";

interface Option {
  id: string;
  name: string;
}

interface IngredientOption extends Option {
  unit: string;
}

interface LineItem {
  ingredientId: string;
  quantityOrdered: string;
  unitCost: string;
}

function emptyLine(): LineItem {
  return { ingredientId: "", quantityOrdered: "", unitCost: "" };
}

export function NewPurchaseOrderForm({
  branches,
  suppliers,
  ingredients,
}: {
  branches: Option[];
  suppliers: Option[];
  ingredients: IngredientOption[];
}) {
  const router = useRouter();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const ingredientUnit = (id: string) => ingredients.find((i) => i.id === id)?.unit ?? "";

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function handleSubmit() {
    setError(null);
    const items = lines
      .filter((line) => line.ingredientId && line.quantityOrdered)
      .map((line) => ({
        ingredientId: line.ingredientId,
        quantityOrdered: Number(line.quantityOrdered),
        unitCost: Number(line.unitCost || 0),
      }));

    if (!branchId || !supplierId || items.length === 0) {
      setError("Pick a branch, a supplier, and at least one ingredient line.");
      return;
    }

    startTransition(async () => {
      try {
        await createPurchaseOrderAction({ branchId, supplierId, notes: notes || undefined, items });
        setLines([emptyLine()]);
        setNotes("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create purchase order.");
      }
    });
  }

  if (branches.length === 0 || suppliers.length === 0 || ingredients.length === 0) {
    return (
      <section className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">New purchase order</h3>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          Add at least one branch, supplier, and ingredient before creating a purchase order.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
      <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">New purchase order</h3>

      <div className="mt-3 flex flex-wrap gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Branch</label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="mt-1 w-48 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Supplier</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="mt-1 w-48 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {lines.map((line, index) => (
          <div key={index} className="flex items-end gap-2">
            <div>
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Ingredient</label>
              <select
                value={line.ingredientId}
                onChange={(e) => updateLine(index, { ingredientId: e.target.value })}
                className="mt-1 w-48 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              >
                <option value="">Select…</option>
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">
                Quantity {line.ingredientId ? `(${ingredientUnit(line.ingredientId)})` : ""}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={line.quantityOrdered}
                onChange={(e) => updateLine(index, { quantityOrdered: e.target.value })}
                className="mt-1 w-28 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Unit cost (GHS)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={line.unitCost}
                onChange={(e) => updateLine(index, { unitCost: e.target.value })}
                className="mt-1 w-28 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              />
            </div>
            <button
              type="button"
              onClick={() => removeLine(index)}
              disabled={lines.length === 1}
              className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium text-stone-500 hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addLine}
          className="text-sm font-medium text-brand-red-600 hover:text-brand-red-500"
        >
          + Add line
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="mt-4 rounded-lg bg-brand-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red-500 disabled:opacity-50"
      >
        {isPending ? "Creating…" : "Create purchase order"}
      </button>
    </section>
  );
}
