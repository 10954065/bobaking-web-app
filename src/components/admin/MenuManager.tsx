"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Pencil, X, Check } from "lucide-react";
import { MenuImage } from "@/components/menu/MenuImage";
import { createCategoryAction, updateCategoryAction, toggleCategoryActiveAction } from "@/modules/categories/actions/category.actions";
import { createProductAction, updateProductAction, toggleProductActiveAction } from "@/modules/products/actions/product.actions";

interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface ProductRow {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  isActive: boolean;
  category: { name: string };
  overrideCount: number;
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-brand-red dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100";

function CategoryFormModal({
  category,
  onClose,
  onSaved,
}: {
  category: CategoryRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        if (category) {
          await updateCategoryAction(category.id, { name: name.trim(), description: description.trim() || undefined });
        } else {
          await createCategoryAction({ name: name.trim(), description: description.trim() || undefined });
        }
        onSaved();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save the category.");
      }
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-800 dark:bg-stone-900"
      >
        <h3 className="font-display text-lg uppercase tracking-tight text-stone-900 dark:text-stone-50">
          {category ? "Edit category" : "New category"}
        </h3>
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={`mt-1 ${inputClass}`} placeholder="e.g. Drinks" />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400">Description (optional)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3.5 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isPending}
            className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-red/20 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProductFormModal({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: ProductRow | null;
  categories: CategoryRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  const [price, setPrice] = useState(product ? String(product.basePrice) : "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const priceNum = Number(price);
    if (!name.trim() || !categoryId || !priceNum || priceNum <= 0) {
      setError("Name, category, and a price greater than zero are required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        if (product) {
          await updateProductAction(product.id, {
            name: name.trim(),
            categoryId,
            basePrice: priceNum,
            description: description.trim() || undefined,
            imageUrl: imageUrl.trim() || undefined,
          });
        } else {
          await createProductAction({
            name: name.trim(),
            categoryId,
            basePrice: priceNum,
            description: description.trim() || undefined,
            imageUrl: imageUrl.trim() || undefined,
          });
        }
        onSaved();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save the product.");
      }
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-800 dark:bg-stone-900"
      >
        <h3 className="font-display text-lg uppercase tracking-tight text-stone-900 dark:text-stone-50">
          {product ? "Edit product" : "New product"}
        </h3>
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={`mt-1 ${inputClass}`} placeholder="e.g. Loaded Fries with Cheese" />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`mt-1 ${inputClass}`}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400">Price (GHS)</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="0.01" className={`mt-1 ${inputClass}`} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400">Image URL (optional)</label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={`mt-1 ${inputClass}`} placeholder="https://…" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400">Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`mt-1 ${inputClass}`} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3.5 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isPending}
            className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-red/20 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function MenuManager({
  categories,
  products,
  canEditCategories,
  canEditProducts,
}: {
  categories: CategoryRow[];
  products: ProductRow[];
  canEditCategories: boolean;
  canEditProducts: boolean;
}) {
  const [categoryModal, setCategoryModal] = useState<"new" | CategoryRow | null>(null);
  const [productModal, setProductModal] = useState<"new" | ProductRow | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <section className="mb-8 rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Categories ({categories.length})
          </h2>
          {canEditCategories && (
            <button
              onClick={() => setCategoryModal("new")}
              className="flex items-center gap-1.5 rounded-lg bg-brand-red px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-[1.03] active:scale-[0.97]"
            >
              <Plus size={13} /> New category
            </button>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category, index) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => canEditCategories && setCategoryModal(category)}
              className={`group flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                category.isActive
                  ? "bg-brand-red-100 text-brand-red-800 dark:bg-brand-red-950 dark:text-brand-red-300"
                  : "bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-500"
              } ${canEditCategories ? "cursor-pointer hover:ring-2 hover:ring-brand-red/40" : ""}`}
            >
              {category.name}
              {canEditCategories && <Pencil size={10} className="opacity-0 transition-opacity group-hover:opacity-60" />}
            </motion.button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="font-display text-sm uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Products ({products.length})
          </h2>
          {canEditProducts && (
            <button
              onClick={() => setProductModal("new")}
              className="flex items-center gap-1.5 rounded-lg bg-brand-red px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-[1.03] active:scale-[0.97]"
            >
              <Plus size={13} /> New product
            </button>
          )}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
              <tr>
                <th className="px-6 py-2 font-medium">
                  <span className="sr-only">Image</span>
                </th>
                <th className="px-6 py-2 font-medium">Product</th>
                <th className="px-6 py-2 font-medium">Category</th>
                <th className="px-6 py-2 font-medium">Base price</th>
                <th className="px-6 py-2 font-medium">Branch overrides</th>
                <th className="px-6 py-2 font-medium">Status</th>
                {canEditProducts && (
                  <th className="px-6 py-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="py-2 pl-6">
                    <MenuImage src={product.imageUrl} alt={product.name} className="size-11 rounded-lg" />
                  </td>
                  <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">{product.name}</td>
                  <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{product.category.name}</td>
                  <td className="px-6 py-3 text-stone-600 dark:text-stone-400">GHS {product.basePrice.toFixed(2)}</td>
                  <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{product.overrideCount}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        product.isActive
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-500"
                      }`}
                    >
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {canEditProducts && (
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setProductModal(product)}
                          title="Edit"
                          className="flex size-7 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() =>
                            startTransition(async () => {
                              await toggleProductActiveAction(product.id, !product.isActive);
                              router.refresh();
                            })
                          }
                          title={product.isActive ? "Deactivate" : "Activate"}
                          className="flex size-7 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                        >
                          {product.isActive ? <X size={13} /> : <Check size={13} />}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AnimatePresence>
        {categoryModal && (
          <CategoryFormModal
            category={categoryModal === "new" ? null : categoryModal}
            onClose={() => setCategoryModal(null)}
            onSaved={() => router.refresh()}
          />
        )}
        {productModal && (
          <ProductFormModal
            product={productModal === "new" ? null : productModal}
            categories={categories}
            onClose={() => setProductModal(null)}
            onSaved={() => router.refresh()}
          />
        )}
      </AnimatePresence>
    </>
  );
}
