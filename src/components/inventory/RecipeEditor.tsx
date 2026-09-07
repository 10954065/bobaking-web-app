"use client";

import { useState, useTransition } from "react";
import { setRecipeAction } from "@/modules/inventory/actions/recipe.actions";

interface IngredientOption {
  id: string;
  name: string;
  unit: string;
}

interface RecipeLine {
  ingredientId: string;
  quantityPerUnit: string;
}

function toLines(items: { ingredientId: string; quantityPerUnit: number }[]): RecipeLine[] {
  return items.map((item) => ({ ingredientId: item.ingredientId, quantityPerUnit: String(item.quantityPerUnit) }));
}

export function RecipeEditor({
  productId,
  canEdit,
  ingredients,
  initialItems,
}: {
  productId: string;
  canEdit: boolean;
  ingredients: IngredientOption[];
  initialItems: { ingredientId: string; quantityPerUnit: number }[];
}) {
  const [lines, setLines] = useState<RecipeLine[]>(
    toLines(initialItems).length > 0 ? toLines(initialItems) : [{ ingredientId: "", quantityPerUnit: "" }]
  );
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const ingredientUnit = (id: string) => ingredients.find((i) => i.id === id)?.unit ?? "";

  function updateLine(index: number, patch: Partial<RecipeLine>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, { ingredientId: "", quantityPerUnit: "" }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    setError(null);
    setSavedAt(null);
    const items = lines
      .filter((line) => line.ingredientId && line.quantityPerUnit)
      .map((line) => ({ ingredientId: line.ingredientId, quantityPerUnit: Number(line.quantityPerUnit) }));

    startTransition(async () => {
      try {
        await setRecipeAction(productId, items);
        setSavedAt(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save recipe.");
      }
    });
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
      <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400">Recipe</h3>

      {ingredients.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">No ingredients in the catalog yet.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {lines.map((line, index) => (
            <div key={index} className="flex items-end gap-2">
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Ingredient</label>
                <select
                  value={line.ingredientId}
                  disabled={!canEdit}
                  onChange={(e) => updateLine(index, { ingredientId: e.target.value })}
                  className="mt-1 w-56 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
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
                  Qty per unit sold {line.ingredientId ? `(${ingredientUnit(line.ingredientId)})` : ""}
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  disabled={!canEdit}
                  value={line.quantityPerUnit}
                  onChange={(e) => updateLine(index, { quantityPerUnit: e.target.value })}
                  className="mt-1 w-32 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium text-stone-500 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {canEdit && (
            <button type="button" onClick={addLine} className="text-sm font-medium text-orange-600 hover:text-orange-500">
              + Add ingredient
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {savedAt && <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">Recipe saved.</p>}

      {canEdit && ingredients.length > 0 && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save recipe"}
        </button>
      )}
    </section>
  );
}
