import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission } from "@/modules/auth/services/authorization.service";
import { listProducts } from "@/modules/products/services/product.service";
import { prisma } from "@/db/client";
import { AdminHeader } from "@/components/AdminHeader";

export default async function RecipesPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "recipes", "read")) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
        <AdminHeader />
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view recipes.</p>
        </main>
      </div>
    );
  }

  const [products, recipeCounts] = await Promise.all([
    listProducts({ includeInactive: true }),
    prisma.recipeItem.groupBy({ by: ["productId"], _count: { productId: true } }),
  ]);
  const recipeCountByProduct = new Map(recipeCounts.map((r) => [r.productId, r._count.productId]));

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <AdminHeader />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Recipes</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            What each menu item consumes — drives automatic stock deduction when the kitchen starts making it.
          </p>
        </div>

        <section className="rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-stone-500 dark:text-stone-400">
                <tr>
                  <th className="px-6 py-2 font-medium">Product</th>
                  <th className="px-6 py-2 font-medium">Category</th>
                  <th className="px-6 py-2 font-medium">Ingredients</th>
                  <th className="px-6 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">{product.name}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{product.category.name}</td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                      {recipeCountByProduct.get(product.id) ?? 0}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link href={`/admin/recipes/${product.id}`} className="text-sm font-medium text-orange-600 hover:text-orange-500">
                        Edit recipe
                      </Link>
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
