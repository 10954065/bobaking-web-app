"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { resetPasswordAction, type ResetPasswordState } from "@/modules/auth/actions/password-reset.actions";

const initialState: ResetPasswordState = { error: null, success: false };

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(resetPasswordAction.bind(null, token), initialState);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-emerald-950/60 text-emerald-400">
          <CheckCircle2 size={20} />
        </span>
        <p className="text-sm text-stone-300">Your password has been reset. You can sign in with it now.</p>
        <Link
          href="/login"
          className="mt-2 rounded-lg bg-brand-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-red-500"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="text-sm font-medium text-stone-300">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="rounded-lg border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-stone-100 outline-none transition-colors focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-stone-300">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="rounded-lg border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-stone-100 outline-none transition-colors focus:border-brand-red-500 focus:ring-1 focus:ring-brand-red-500"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/40 px-3.5 py-2.5 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-1 rounded-lg bg-brand-red-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-brand-red-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}
