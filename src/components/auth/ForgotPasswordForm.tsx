"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { requestPasswordResetAction, type RequestResetState } from "@/modules/auth/actions/password-reset.actions";

const initialState: RequestResetState = { message: null, error: null };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, initialState);

  if (state.message) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-emerald-950/60 text-emerald-400">
          <MailCheck size={20} />
        </span>
        <p className="text-sm text-stone-300">{state.message}</p>
        {state.devResetPath && (
          <div className="mt-2 w-full rounded-lg border border-amber-900/60 bg-amber-950/30 p-3 text-left text-xs text-amber-300">
            <p className="mb-1 font-semibold uppercase tracking-wide">Development mode</p>
            <p className="mb-2">No email provider is configured yet, so here&apos;s the link directly:</p>
            <Link href={state.devResetPath} className="break-all font-mono text-amber-200 underline">
              {state.devResetPath}
            </Link>
          </div>
        )}
        <Link href="/" className="mt-2 text-sm font-medium text-brand-red-500 hover:text-brand-red-400">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-stone-300">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
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
        {isPending ? "Sending…" : "Send reset link"}
      </button>

      <Link href="/" className="text-center text-sm font-medium text-stone-400 hover:text-stone-200">
        Back to home
      </Link>
    </form>
  );
}
