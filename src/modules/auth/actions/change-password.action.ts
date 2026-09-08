"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/db/client";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { verifyPassword, hashPassword } from "@/modules/auth/services/password.service";
import { recordAuditLog } from "@/modules/audit/services/audit.service";
import { enforceRateLimit, getRequestIp, RateLimitError } from "@/lib/rate-limit";

export interface ChangePasswordState {
  error: string | null;
  success: boolean;
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

// Keyed per-account (not per-IP) — this guards a logged-in user's own
// password against someone who has hijacked their session trying to brute
// force the current-password check before it locks them out elsewhere.
const CHANGE_PASSWORD_RATE_LIMIT = { limit: 5, windowSeconds: 10 * 60 };

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  try {
    await enforceRateLimit(`change-password:${session.user.id}`, CHANGE_PASSWORD_RATE_LIMIT);
  } catch (error) {
    if (error instanceof RateLimitError) return { error: error.message, success: false };
    throw error;
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again.", success: false };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.passwordHash || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return { error: "Current password is incorrect.", success: false };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  const ip = await getRequestIp();
  await recordAuditLog({
    actorUserId: user.id,
    action: "auth.password_changed",
    resourceType: "User",
    resourceId: user.id,
    ipAddress: ip,
  }).catch(() => {});

  return { error: null, success: true };
}
