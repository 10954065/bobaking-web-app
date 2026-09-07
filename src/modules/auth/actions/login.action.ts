"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export interface LoginState {
  error: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  AccountLocked: "Too many failed attempts. This account is temporarily locked — try again in 15 minutes.",
  AccountInactive: "This account is not active. Contact an administrator.",
  CredentialsSignin: "Incorrect email/phone or password.",
};

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/admin");

  try {
    await signIn("credentials", { identifier, password, redirectTo: callbackUrl });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      const code = (error as AuthError & { code?: string }).code ?? error.type;
      return { error: ERROR_MESSAGES[code] ?? "Something went wrong. Please try again." };
    }
    // next/navigation's redirect() throws internally on success — must propagate, not be swallowed.
    throw error;
  }
}
