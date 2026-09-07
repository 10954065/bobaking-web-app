import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, getAccessibleBranchIds } from "@/modules/auth/services/authorization.service";
import { listKitchenQueueForBranch, toKdsOrder } from "@/modules/kitchen/services/kitchen-order.service";
import { listBranches } from "@/modules/branches/services/branch.service";
import { KitchenBoard } from "@/components/kitchen/KitchenBoard";

export default async function KitchenPage({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "kitchen", "read")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 text-stone-400">
        You don&apos;t have permission to view the kitchen display.
      </div>
    );
  }

  const accessibleBranchIds = getAccessibleBranchIds(profile, "kitchen", "read");
  const branches = await listBranches(accessibleBranchIds === "ALL" ? {} : { branchIds: accessibleBranchIds });

  const { branch: branchParam } = await searchParams;
  const branchId = branchParam ?? branches[0]?.id;
  const currentBranch = branches.find((b) => b.id === branchId);

  if (!branchId || !currentBranch) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 text-stone-400">
        No branch access configured for the kitchen display.
      </div>
    );
  }

  const orders = await listKitchenQueueForBranch(branchId);

  return (
    <KitchenBoard
      branchId={branchId}
      branchName={currentBranch.name}
      branches={branches.map((b) => ({ id: b.id, name: b.name }))}
      initialOrders={orders.map(toKdsOrder)}
    />
  );
}
