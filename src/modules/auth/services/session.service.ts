import { randomUUID } from "crypto";
import { prisma } from "@/db/client";

/**
 * Auth.js is configured with the Credentials provider, which forces JWT-based
 * sessions (database sessions are only available for adapter-linked providers).
 * To still support "device/session tracking" and server-side revocation, we keep
 * our own lightweight Session record: a random id is embedded in the JWT and
 * checked against this table on every request. Revoking a row here invalidates
 * the corresponding JWT immediately, without waiting for it to expire.
 */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export async function createTrackedSession(params: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.session.create({
    data: {
      sessionToken,
      userId: params.userId,
      expires,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    },
  });

  return sessionToken;
}

export async function isTrackedSessionValid(sessionToken: string): Promise<boolean> {
  const session = await prisma.session.findUnique({
    where: { sessionToken },
    select: { expires: true },
  });
  if (!session) return false;
  return session.expires.getTime() > Date.now();
}

export async function revokeTrackedSession(sessionToken: string): Promise<void> {
  await prisma.session.deleteMany({ where: { sessionToken } });
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function listActiveSessionsForUser(userId: string) {
  return prisma.session.findMany({
    where: { userId, expires: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, sessionToken: true, ipAddress: true, userAgent: true, createdAt: true, expires: true },
  });
}
