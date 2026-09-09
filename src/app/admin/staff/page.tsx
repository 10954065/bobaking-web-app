import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission, hasPermission } from "@/modules/auth/services/authorization.service";
import { listStaffUsers, userHasRole } from "@/modules/users/services/user.service";
import { listBranches } from "@/modules/branches/services/branch.service";
import { prisma } from "@/db/client";
import { StaffManager } from "@/components/admin/StaffManager";

export default async function StaffPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const profile = await getUserAccessProfile(session.user.id);
  if (!hasAnyPermission(profile, "users", "read")) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">You don&apos;t have permission to view staff accounts.</p>
        </main>
      </div>
    );
  }

  const [staff, branches, allRoles, canGrantSuperAdmin] = await Promise.all([
    listStaffUsers(),
    listBranches(),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    userHasRole(session.user.id, "SUPER_ADMIN"),
  ]);

  const roles = canGrantSuperAdmin ? allRoles : allRoles.filter((r) => r.name !== "SUPER_ADMIN");

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl uppercase tracking-tight text-stone-900 dark:text-stone-50">Staff</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Accounts for people working at your branches. What they log into (POS, kitchen display, rider app, or the back office) is
            determined by the role and branch you assign here.
          </p>
        </div>
        <StaffManager
          staff={staff.map((s) => ({
            id: s.id,
            firstName: s.firstName,
            lastName: s.lastName,
            email: s.email,
            phone: s.phone,
            status: s.status,
            roles: s.userRoles.map((ur) => ({
              userRoleId: ur.id,
              roleName: ur.role.name,
              branchName: ur.branch?.name ?? null,
            })),
          }))}
          roles={roles.map((r) => ({ id: r.id, name: r.name }))}
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          canCreate={hasPermission(profile, "users", "create", null)}
          canUpdate={hasPermission(profile, "users", "update", null)}
          canDeactivate={hasPermission(profile, "users", "delete", null)}
        />
      </main>
    </div>
  );
}
