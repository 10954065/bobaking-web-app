import crypto from "crypto";
import { prisma } from "@/db/client";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Only the SHA-256 hash is ever stored — same reasoning as a password hash:
 * a database leak must not hand out working reset links. Any previously
 * issued, still-unused token for this user is invalidated first, so only
 * the most recently requested link works (an attacker who requested a reset
 * earlier can't race a legitimate one).
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    }),
  ]);

  return token;
}

/** Validates and single-use-consumes a raw reset token; returns the target userId, or null if invalid/expired/already used. */
export async function consumePasswordResetToken(rawToken: string): Promise<string | null> {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) return null;

  await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return record.userId;
}
