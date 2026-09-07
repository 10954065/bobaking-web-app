import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission } from "@/modules/auth/services/authorization.service";
import { getProductById } from "@/modules/products/services/product.service";
import { getRecipeForProduct } from "@/modules/inventory/services/recipe.service";
import { listIngredients } from "@/modules/inventory/services/ingredient.service";
import { AdminHeader } from "@/components/AdminHeader";
import { RecipeEditor } from "@/components/inventory/RecipeEditor";

export default async function RecipeEditorPage({ params }: { params: Promise<{ productId: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const { productId } = await params;
  const product = await getProductById(productId);
  if (!product) notFound();

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

  const canEdit = hasAnyPermission(profile, "recipes", "update");
  const [recipeItems, ingredients] = await Promise.all([getRecipeForProduct(productId), listIngredients()]);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <AdminHeader />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">{product.name}</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Ingredients consumed per unit sold. Deducted from branch stock when the kitchen starts this item.
            </p>
          </div>
          <Link
            href="/admin/recipes"
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Back to recipes
          </Link>
        </div>

        <RecipeEditor
          productId={productId}
          canEdit={canEdit}
          ingredients={ingredients.map((i) => ({ id: i.id, name: i.name, unit: i.unit }))}
          initialItems={recipeItems.map((item) => ({
            ingredientId: item.ingredientId,
            quantityPerUnit: Number(item.quantityPerUnit),
          }))}
        />
      </main>
    </div>
  );
}
