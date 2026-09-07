import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission } from "@/modules/auth/services/authorization.service";
import { listCategories } from "@/modules/categories/services/category.service";
import { listProducts } from "@/modules/products/services/product.service";
import { prisma } from "@/db/client";
import { AdminHeader } from "@/components/AdminHeader";

export default async function AdminMenuPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "products", "read")) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
        <AdminHeader />
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            You don&apos;t have permission to view the menu.
          </p>
        </main>
      </div>
    );
  }

  const [categories, products, overrideCounts] = await Promise.all([
    listCategories({ includeInactive: true }),
    listProducts({ includeInactive: true }),
    prisma.productBranchOverride.groupBy({ by: ["productId"], _count: { productId: true } }),
  ]);

  const overrideCountByProduct = new Map(overrideCounts.map((o) => [o.productId, o._count.productId]));

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <AdminHeader />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <section className="mb-8 rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400">
            Categories ({categories.length})
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <span
                key={category.id}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  category.isActive
                    ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
                    : "bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-500"
                }`}
              >
                {category.name}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <h2 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">
            Products ({products.length})
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
                <tr>
                  <th className="px-6 py-2 font-medium">Product</th>
                  <th className="px-6 py-2 font-medium">Category</th>
                  <th className="px-6 py-2 font-medium">Base price</th>
                  <th className="px-6 py-2 font-medium">Branch overrides</th>
                  <th className="px-6 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">{product.name}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{product.category.name}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                      GHS {Number(product.basePrice).toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                      {overrideCountByProduct.get(product.id) ?? 0}
                    </td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
