import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserRound, UtensilsCrossed } from "lucide-react";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { prisma } from "@/db/client";
import { resolvePrimarySurface, surfaceHomeHref } from "@/lib/dashboard-nav";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { signOutAction } from "@/modules/auth/actions/sign-out.action";

export default async function AccountPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const [user, userRoles] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
    prisma.userRole.findMany({ where: { userId: session.user.id }, include: { role: true, branch: true } }),
  ]);

  const surface = resolvePrimarySurface(userRoles.map((ur) => ur.role.name));
  const homeHref = surfaceHomeHref(surface);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="flex items-center justify-between border-b border-stone-800 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white">
            <UtensilsCrossed size={17} strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-500">Flicks &amp; Licks</p>
            <h1 className="text-base font-semibold text-stone-50">My account</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={homeHref}
            className="flex items-center gap-1.5 rounded-lg border border-stone-700 px-3 py-2 text-sm font-medium text-stone-200 transition-colors hover:bg-stone-800"
          >
            <ArrowLeft size={15} /> Back
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-lg border border-stone-700 px-3 py-2 text-sm font-medium text-stone-200 transition-colors hover:bg-red-950/50 hover:border-red-900 hover:text-red-300"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-4 py-8 sm:px-6">
        <section className="flex items-center gap-4 rounded-xl border border-stone-800 bg-stone-900 p-6">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-orange-950 text-orange-300">
            <UserRound size={24} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-stone-50">{user.name ?? "Staff"}</p>
            <p className="truncate text-sm text-stone-400">{user.email ?? user.phone ?? "—"}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {userRoles.map((ur) => (
                <span key={ur.id} className="rounded-full bg-orange-950 px-2.5 py-0.5 text-xs font-medium text-orange-300">
                  {ur.role.name.split("_").join(" ")}
                  {ur.branch ? ` · ${ur.branch.name}` : " · All branches"}
                </span>
              ))}
              {userRoles.length === 0 && <span className="text-xs text-stone-500">No role assigned</span>}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-stone-800 bg-stone-900 p-6">
          <h2 className="mb-4 text-sm font-semibold text-stone-400">Change password</h2>
          <ChangePasswordForm />
        </section>
      </main>
    </div>
  );
}
