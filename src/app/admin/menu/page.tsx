import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, hasPermission } from "@/modules/auth/services/authorization.service";
import { listCategories } from "@/modules/categories/services/category.service";
import { listProducts } from "@/modules/products/services/product.service";
import { prisma } from "@/db/client";
import { MenuManager } from "@/components/admin/MenuManager";

export default async function AdminMenuPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "products", "read")) {
    return (
      <div className="min-h-screen">
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
    <div className="min-h-screen">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="mb-6 font-display text-2xl uppercase tracking-tight text-stone-900 dark:text-stone-50">Menu</h1>
        <MenuManager
          categories={categories.map((c) => ({ id: c.id, name: c.name, description: c.description, isActive: c.isActive }))}
          products={products.map((p) => ({
            id: p.id,
            categoryId: p.categoryId,
            name: p.name,
            description: p.description,
            basePrice: Number(p.basePrice),
            imageUrl: p.imageUrl,
            isActive: p.isActive,
            category: { name: p.category.name },
            overrideCount: overrideCountByProduct.get(p.id) ?? 0,
          }))}
          canEditCategories={hasPermission(profile, "categories", "create", null) || hasPermission(profile, "categories", "update", null)}
          canEditProducts={hasPermission(profile, "products", "create", null) || hasPermission(profile, "products", "update", null)}
        />
      </main>
    </div>
  );
}
