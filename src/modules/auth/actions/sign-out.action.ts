"use server";

import { signOut } from "@/auth";

/** Shared across every surface (admin sidebar, POS, kitchen, rider) — one sign-out action, one place that revokes the tracked session. */
export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
