import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasAnyPermission } from "@/modules/auth/services/authorization.service";
import { prisma } from "@/db/client";
import { resolvePrimarySurface, surfaceHomeHref, visibleNavHrefs } from "@/lib/dashboard-nav";
import { DashboardShell } from "@/components/nav/DashboardShell";
import { signOutAction } from "@/modules/auth/actions/sign-out.action";

function formatRoleLabel(name: string): string {
  return name
    .split("_")
    .map((word) => word[0] + word.slice(1).toLowerCase())
    .join(" ");
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const [profile, userRoles] = await Promise.all([
    getUserAccessProfile(session.user.id),
    prisma.userRole.findMany({ where: { userId: session.user.id }, include: { role: true, branch: true } }),
  ]);

  const surface = resolvePrimarySurface(userRoles.map((ur) => ur.role.name));

  // The admin back office is not this account's primary surface — send it
  // straight to the one tool it's actually meant to use, for every /admin/*
  // route (this layout wraps all of them), not just the dashboard root.
  if (surface !== "admin" && surface !== "none") {
    redirect(surfaceHomeHref(surface));
  }

  if (surface === "none") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 px-4 text-center">
        <p className="text-sm text-stone-400">
          This account isn&apos;t assigned to a role yet. Contact an administrator to get access configured.
        </p>
      </div>
    );
  }

  const visibleHrefs = visibleNavHrefs((resource, action) => hasAnyPermission(profile, resource, action));
  const primaryRole = userRoles[0];

  return (
    <DashboardShell
      visibleHrefs={visibleHrefs}
      userName={session.user.name ?? session.user.email ?? "Staff"}
      roleLabel={primaryRole ? formatRoleLabel(primaryRole.role.name) : "Staff"}
      branchLabel={primaryRole?.branch?.name ?? "All branches"}
      signOutAction={signOutAction}
    >
      {children}
    </DashboardShell>
  );
}
