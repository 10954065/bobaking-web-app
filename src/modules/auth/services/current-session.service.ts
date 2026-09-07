import { auth } from "@/auth";

/**
 * Wraps auth() and treats a revoked tracked session (see session.service.ts)
 * the same as "not signed in" — callers never need to know about the
 * session.error escape hatch individually.
 */
export async function getCurrentSession() {
  const session = await auth();
  if (!session || session.error === "SessionRevoked") return null;
  return session;
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.user?.id ?? null;
}
