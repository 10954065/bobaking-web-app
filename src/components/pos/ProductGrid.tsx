"use client";

import { useMemo, useState } from "react";
import type { PosProduct } from "@/modules/pos/services/pos-catalog.service";

interface Category {
  id: string;
  name: string;
}

export function ProductGrid({
  categories,
  products,
  onSelectProduct,
}: {
  categories: Category[];
  products: PosProduct[];
  onSelectProduct: (product: PosProduct) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = activeCategory === "all" || p.categoryId === activeCategory;
      const matchesQuery = query.trim() === "" || p.name.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [products, activeCategory, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-stone-800 p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          className="mb-3 w-full rounded-lg border border-stone-700 bg-stone-900 px-3.5 py-2 text-sm text-stone-100 outline-none focus:border-orange-500"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeCategory === "all" ? "bg-orange-600 text-white" : "bg-stone-800 text-stone-300 hover:bg-stone-700"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeCategory === c.id ? "bg-orange-600 text-white" : "bg-stone-800 text-stone-300 hover:bg-stone-700"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((product) => (
          <button
            key={product.id}
            onClick={() => product.isAvailable && onSelectProduct(product)}
            disabled={!product.isAvailable}
            className={`flex flex-col items-start rounded-xl border p-3 text-left transition-colors ${
              product.isAvailable
                ? "border-stone-800 bg-stone-900 hover:border-orange-600"
                : "cursor-not-allowed border-stone-900 bg-stone-950 opacity-40"
            }`}
          >
            <span className="text-sm font-medium text-stone-100">{product.name}</span>
            <span className="mt-1 text-sm font-semibold text-orange-500">GHS {product.price.toFixed(2)}</span>
            {!product.isAvailable && <span className="mt-1 text-xs text-stone-500">Unavailable at this branch</span>}
          </button>
        ))}
        {filtered.length === 0 && <p className="col-span-full py-8 text-center text-sm text-stone-500">No products found.</p>}
      </div>
    </div>
  );
}
