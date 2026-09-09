"use server";

import { signOut } from "@/auth";
import { env } from "@/lib/env";

/**
 * Shared across every surface (admin sidebar, POS, kitchen, rider) — one
 * sign-out action, one place that revokes the tracked session. Redirects to
 * the secret staff gate (which proxy.ts transparently rewrites to /login),
 * never to the literal "/login" path — a signed-out browser hitting that
 * directly just 404s (see proxy.ts's STAFF_ACCESS_KEY gate), and the point
 * of the gate is that the real login path is never shown to anyone who
 * didn't already have this link. Signing out doesn't newly expose it: only
 * someone who already knows the gate (i.e. already reached the sign-in form
 * once) can trigger this action in the first place.
 */
export async function signOutAction() {
  await signOut({ redirectTo: `/${env.STAFF_ACCESS_KEY}` });
}
