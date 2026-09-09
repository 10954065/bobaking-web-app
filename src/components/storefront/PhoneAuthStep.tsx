"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { storefrontInputClass } from "@/components/storefront/input-styles";
import {
  requestCustomerOtpAction,
  verifyCustomerOtpAction,
} from "@/modules/customer-auth/actions/customer-auth.actions";
import type { CurrentCustomer } from "@/modules/customer-auth/services/current-customer.service";

const RESEND_COOLDOWN_MS = 30_000;

/**
 * The customer's login: a Ghana phone number verified by a one-time SMS
 * code, gating checkout — see StorefrontApp's "phone" step. The +233 prefix
 * is a fixed badge, not typed, so what reaches the server is always the
 * canonical +233XXXXXXXXX form, never a bare 9/10-digit string.
 */
export function PhoneAuthStep({ onVerified, onBack }: { onVerified: (customer: CurrentCustomer) => void; onBack: () => void }) {
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [nationalNumber, setNationalNumber] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [isPending, startTransition] = useTransition();

  const phone = `+233${nationalNumber}`;
  const canSubmitPhone = /^\d{9}$/.test(nationalNumber);
  const canSubmitCode = /^\d{6}$/.test(code);
  const canResend = Date.now() >= resendAt;

  function requestCode() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await requestCustomerOtpAction(phone);
        setDevCode(result.devCode);
        setResendAt(Date.now() + RESEND_COOLDOWN_MS);
        setStage("code");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't send a code. Please try again.");
      }
    });
  }

  function verifyCode() {
    setError(null);
    startTransition(async () => {
      try {
        const customer = await verifyCustomerOtpAction({ phone, code });
        onVerified(customer);
      } catch (e) {
        setError(e instanceof Error ? e.message : "That code didn't work. Please try again.");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <button
        onClick={stage === "code" ? () => setStage("phone") : onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-stone-400 transition-colors hover:text-stone-100"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <div className="mt-4 flex items-center gap-2.5">
        <span className="h-6 w-1 rounded-full bg-brand-red shadow-[0_0_10px_rgba(228,35,19,0.6)]" />
        <h1 className="font-display text-2xl uppercase tracking-tight text-stone-50">
          {stage === "phone" ? "Verify your number" : "Enter the code"}
        </h1>
      </div>
      <p className="mt-1 pl-3.5 text-sm text-stone-400">
        {stage === "phone"
          ? "We'll text you a one-time code to confirm your order."
          : `We sent a 6-digit code to ${phone}.`}
      </p>

      {error && <p className="mt-4 rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
      {devCode && (
        <p className="mt-4 rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
          DEV: no real SMS gateway is connected yet. Your code is <span className="font-mono font-bold">{devCode}</span>.
        </p>
      )}

      {stage === "phone" ? (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-[46px] shrink-0 items-center rounded-xl border border-stone-700/80 bg-stone-900/70 px-3.5 text-sm font-medium text-stone-300">
              +233
            </span>
            <input
              value={nationalNumber}
              onChange={(e) => setNationalNumber(e.target.value.replace(/\D/g, "").slice(0, 9))}
              placeholder="244123456"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              className={storefrontInputClass}
            />
          </div>
          <button
            onClick={requestCode}
            disabled={!canSubmitPhone || isPending}
            className="w-full rounded-2xl bg-brand-red py-3.5 font-display text-base uppercase tracking-wide text-white shadow-lg shadow-brand-red/25 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:scale-100"
          >
            {isPending ? "Sending…" : "Send code"}
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <div className="relative">
            <ShieldCheck size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={storefrontInputClass}
            />
          </div>
          <button
            onClick={verifyCode}
            disabled={!canSubmitCode || isPending}
            className="w-full rounded-2xl bg-brand-red py-3.5 font-display text-base uppercase tracking-wide text-white shadow-lg shadow-brand-red/25 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:scale-100"
          >
            {isPending ? "Verifying…" : "Verify"}
          </button>
          <button
            onClick={requestCode}
            disabled={!canResend || isPending}
            className="w-full text-center text-sm font-medium text-stone-400 transition-colors hover:text-stone-100 disabled:opacity-40"
          >
            Resend code
          </button>
        </div>
      )}
    </div>
  );
}
