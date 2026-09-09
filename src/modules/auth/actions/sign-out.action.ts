"use server";

import { signOut } from "@/auth";

/**
 * Shared across every surface (admin sidebar, POS, kitchen, rider) — one
 * sign-out action, one place that revokes the tracked session. Redirects
 * home, not to /login — the signed-out browser has no session, and /login
 * now 404s for anyone without one (see proxy.ts's STAFF_ACCESS_KEY gate) so
 * that link is never shown to the public with no way to reach it.
 */
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
