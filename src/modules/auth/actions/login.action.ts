"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { enforceRateLimit, getRequestIp, RateLimitError } from "@/lib/rate-limit";

export interface LoginState {
  error: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  AccountLocked: "Too many failed attempts. This account is temporarily locked — try again in 15 minutes.",
  AccountInactive: "This account is not active. Contact an administrator.",
  CredentialsSignin: "Incorrect email/phone or password.",
};

/**
 * IP-based, on top of account-lockout.service.ts's per-account lockout — that
 * one stops brute-forcing a single account, this one stops a single IP from
 * spraying attempts across many accounts (credential stuffing).
 */
const LOGIN_RATE_LIMIT = { limit: 15, windowSeconds: 10 * 60 };

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/admin");

  try {
    const ip = await getRequestIp();
    await enforceRateLimit(`login:${ip}`, LOGIN_RATE_LIMIT);

    await signIn("credentials", { identifier, password, redirectTo: callbackUrl });
    return { error: null };
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { error: error.message };
    }
    if (error instanceof AuthError) {
      // Auth.js's base CredentialsSignin always sets `.code = "credentials"`
      // (lowercase, not one of our keys) — only our own AccountLocked/
      // AccountInactive subclasses override it to something we recognize.
      // So `.code` is trusted only when it's actually one of our keys;
      // otherwise fall back to `.type`, which is "CredentialsSignin" for the
      // plain wrong-password case.
      const rawCode = (error as AuthError & { code?: string }).code;
      const code = rawCode && rawCode in ERROR_MESSAGES ? rawCode : error.type;
      return { error: ERROR_MESSAGES[code] ?? "Something went wrong. Please try again." };
    }
    // next/navigation's redirect() throws internally on success — must propagate, not be swallowed.
    throw error;
  }
}
