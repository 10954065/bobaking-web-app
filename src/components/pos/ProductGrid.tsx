"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { MenuImage } from "@/components/menu/MenuImage";
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
        <div className="relative mb-3">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-lg border border-stone-700 bg-stone-900 py-2 pl-9 pr-3.5 text-sm text-stone-100 outline-none focus:border-brand-red"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeCategory === "all" ? "bg-brand-red text-white" : "bg-stone-800 text-stone-300 hover:bg-stone-700"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeCategory === c.id ? "bg-brand-red text-white" : "bg-stone-800 text-stone-300 hover:bg-stone-700"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="scrollbar-thin grid flex-1 grid-cols-2 gap-4 overflow-y-auto p-4 sm:grid-cols-3 xl:grid-cols-4">
        {filtered.map((product) => (
          <button
            key={product.id}
            onClick={() => product.isAvailable && onSelectProduct(product)}
            disabled={!product.isAvailable}
            className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition-all ${
              product.isAvailable
                ? "border-stone-800 bg-stone-900 hover:-translate-y-0.5 hover:border-brand-red hover:shadow-lg hover:shadow-black/30"
                : "cursor-not-allowed border-stone-900 bg-stone-950 opacity-40"
            }`}
          >
            <MenuImage
              src={product.imageUrl}
              alt={product.name}
              className={`aspect-square w-full transition-transform duration-300 ${product.isAvailable ? "group-hover:scale-105" : ""}`}
            />
            <div className="flex flex-1 flex-col gap-1 p-3">
              <span className="text-sm font-semibold leading-snug text-stone-100 sm:text-base">{product.name}</span>
              <span className="mt-auto text-sm font-bold text-brand-red-light sm:text-base">GHS {product.price.toFixed(2)}</span>
              {!product.isAvailable && <span className="text-xs text-stone-500">Unavailable at this branch</span>}
            </div>
          </button>
        ))}
        {filtered.length === 0 && <p className="col-span-full py-8 text-center text-sm text-stone-500">No products found.</p>}
      </div>
    </div>
  );
}
