import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, getAccessibleBranchIds } from "@/modules/auth/services/authorization.service";
import { listBranches } from "@/modules/branches/services/branch.service";
import { listCategories } from "@/modules/categories/services/category.service";
import { listPosProducts } from "@/modules/pos/services/pos-catalog.service";
import { PosWorkspace } from "@/components/pos/PosWorkspace";

export default async function PosPage({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "orders", "create")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 text-stone-400">
        You don&apos;t have permission to use the POS.
      </div>
    );
  }

  const accessibleBranchIds = getAccessibleBranchIds(profile, "orders", "create");
  const branches = await listBranches(accessibleBranchIds === "ALL" ? {} : { branchIds: accessibleBranchIds });

  const { branch: branchParam } = await searchParams;
  const branchId = branchParam ?? branches[0]?.id;
  const currentBranch = branches.find((b) => b.id === branchId);

  if (!branchId || !currentBranch) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 text-stone-400">
        No branch access configured for the POS.
      </div>
    );
  }

  const [categories, products] = await Promise.all([listCategories(), listPosProducts(branchId)]);

  return (
    <PosWorkspace
      branchId={branchId}
      branchName={currentBranch.name}
      branches={branches.map((b) => ({ id: b.id, name: b.name }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      products={products}
    />
  );
}
