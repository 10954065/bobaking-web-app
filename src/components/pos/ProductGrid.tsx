"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { MenuImage } from "@/components/menu/MenuImage";
import type { PosProduct } from "@/modules/pos/services/pos-catalog.service";

interface Category {
  id: string;
  name: string;
}

/** `variant` picks the theme: "dark" (default) is the internal POS look this
 * component was built for; "light" is the customer-facing storefront theme
 * (see StorefrontApp) — same component, same behavior, different palette,
 * so the two surfaces never drift apart in structure. */
export function ProductGrid({
  categories,
  products,
  onSelectProduct,
  variant = "dark",
}: {
  categories: Category[];
  products: PosProduct[];
  onSelectProduct: (product: PosProduct) => void;
  variant?: "dark" | "light";
}) {
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [query, setQuery] = useState("");
  const light = variant === "light";

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = activeCategory === "all" || p.categoryId === activeCategory;
      const matchesQuery = query.trim() === "" || p.name.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [products, activeCategory, query]);

  return (
    <div className="flex h-full flex-col">
      <div className={`p-4 ${light ? "border-b border-brand-ink/10" : "border-b border-stone-800"}`}>
        <div className="relative mb-3">
          <Search size={16} className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${light ? "text-brand-ink/40" : "text-stone-500"}`} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className={`w-full rounded-lg py-2 pl-9 pr-3.5 text-sm outline-none ${
              light
                ? "border border-brand-ink/12 bg-white text-brand-ink placeholder:text-brand-ink/40 focus:border-brand-red"
                : "border border-stone-700 bg-stone-900 text-stone-100 focus:border-brand-red"
            }`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeCategory === "all"
                ? "bg-brand-red text-white"
                : light
                  ? "bg-brand-cream text-brand-ink/60 hover:bg-brand-ink/10"
                  : "bg-stone-800 text-stone-300 hover:bg-stone-700"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeCategory === c.id
                  ? "bg-brand-red text-white"
                  : light
                    ? "bg-brand-cream text-brand-ink/60 hover:bg-brand-ink/10"
                    : "bg-stone-800 text-stone-300 hover:bg-stone-700"
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
                ? light
                  ? "border-brand-ink/10 bg-white hover:-translate-y-0.5 hover:border-brand-red hover:shadow-lg hover:shadow-brand-ink/10"
                  : "border-stone-800 bg-stone-900 hover:-translate-y-0.5 hover:border-brand-red hover:shadow-lg hover:shadow-black/30"
                : light
                  ? "cursor-not-allowed border-brand-ink/8 bg-brand-cream/60 opacity-50"
                  : "cursor-not-allowed border-stone-900 bg-stone-950 opacity-40"
            }`}
          >
            <MenuImage
              src={product.imageUrl}
              alt={product.name}
              className={`aspect-square w-full transition-transform duration-300 ${product.isAvailable ? "group-hover:scale-105" : ""}`}
            />
            <div className="flex flex-1 flex-col gap-1 p-3">
              <span className={`text-sm font-semibold leading-snug sm:text-base ${light ? "text-brand-ink" : "text-stone-100"}`}>{product.name}</span>
              <span className={`mt-auto text-sm font-bold sm:text-base ${light ? "text-brand-red-700" : "text-brand-red-light"}`}>
                GHS {product.price.toFixed(2)}
              </span>
              {!product.isAvailable && (
                <span className={`text-xs ${light ? "text-brand-ink/40" : "text-stone-500"}`}>Unavailable at this branch</span>
              )}
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className={`col-span-full py-8 text-center text-sm ${light ? "text-brand-ink/40" : "text-stone-500"}`}>No products found.</p>
        )}
      </div>
    </div>
  );
}
