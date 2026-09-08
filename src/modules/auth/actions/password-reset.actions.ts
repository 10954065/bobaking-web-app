"use server";

import { z } from "zod";
import { prisma } from "@/db/client";
import { hashPassword } from "@/modules/auth/services/password.service";
import { createPasswordResetToken, consumePasswordResetToken } from "@/modules/auth/services/password-reset.service";
import { recordAuditLog } from "@/modules/audit/services/audit.service";
import { enforceRateLimit, getRequestIp, RateLimitError } from "@/lib/rate-limit";

export interface RequestResetState {
  message: string | null;
  error: string | null;
  /** Only ever populated outside production — see the comment below. */
  devResetPath?: string | null;
}

const REQUEST_RESET_RATE_LIMIT = { limit: 5, windowSeconds: 15 * 60 };

const GENERIC_SUCCESS: RequestResetState = {
  message: "If an account exists for that email, we've sent password reset instructions.",
  error: null,
};

export async function requestPasswordResetAction(
  _prevState: RequestResetState,
  formData: FormData
): Promise<RequestResetState> {
  const email = String(formData.get("email") ?? "").trim();

  try {
    const ip = await getRequestIp();
    await enforceRateLimit(`password-reset-request:${ip}`, REQUEST_RESET_RATE_LIMIT);
  } catch (error) {
    if (error instanceof RateLimitError) return { message: null, error: error.message };
    throw error;
  }

  if (!email) return { message: null, error: "Enter the email address on your account." };

  // Constant-shape response whether the account exists or not — never leak
  // account existence, same posture as the login credentials check.
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") return GENERIC_SUCCESS;

  const token = await createPasswordResetToken(user.id);
  const devResetPath = `/reset-password/${token}`;

  await recordAuditLog({
    actorUserId: null,
    action: "auth.password_reset_requested",
    resourceType: "User",
    resourceId: user.id,
  }).catch(() => {});

  // Dev-stub: no real email/SMTP provider is wired up (same posture as the
  // Mobile Money payment provider and the customer notification log
  // elsewhere in this codebase) — writing the token IS the "send". Only
  // outside production do we hand the link straight back, so the flow is
  // genuinely testable without a real mailbox; production must not leak a
  // working reset link into the HTTP response.
  if (process.env.NODE_ENV !== "production") {
    return { ...GENERIC_SUCCESS, devResetPath };
  }

  return GENERIC_SUCCESS;
}

export interface ResetPasswordState {
  error: string | null;
  success: boolean;
}

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function resetPasswordAction(
  token: string,
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again.", success: false };
  }

  const userId = await consumePasswordResetToken(token);
  if (!userId) {
    return { error: "This reset link is invalid or has expired. Request a new one.", success: false };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  // Also clears any account lockout — a successful reset proves ownership,
  // same as a successful login would.
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
  });

  await recordAuditLog({
    actorUserId: userId,
    action: "auth.password_reset_completed",
    resourceType: "User",
    resourceId: userId,
  }).catch(() => {});

  return { error: null, success: true };
}
