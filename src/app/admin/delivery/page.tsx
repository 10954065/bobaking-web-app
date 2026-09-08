import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, getAccessibleBranchIds } from "@/modules/auth/services/authorization.service";
import { listBranches } from "@/modules/branches/services/branch.service";
import { getDeliveryBoardAction } from "@/modules/delivery/actions/board.actions";
import { DeliveryBoard } from "@/components/delivery/DeliveryBoard";

export default async function AdminDeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "delivery", "read")) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view delivery.</p>
        </main>
      </div>
    );
  }

  const accessibleBranchIds = getAccessibleBranchIds(profile, "delivery", "read");
  const branches = await listBranches(accessibleBranchIds === "ALL" ? {} : { branchIds: accessibleBranchIds });

  const { branch: branchParam } = await searchParams;
  const branchId = branchParam ?? branches[0]?.id;
  const currentBranch = branches.find((b) => b.id === branchId);

  if (!branchId || !currentBranch) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">No branch access configured for delivery.</p>
        </main>
      </div>
    );
  }

  const canAssign = hasAnyPermission(profile, "delivery", "assign");
  const board = await getDeliveryBoardAction(branchId);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <DeliveryBoard
        branchId={branchId}
        branchName={currentBranch.name}
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        initialBoard={board}
        canAssign={canAssign}
      />
    </div>
  );
}
