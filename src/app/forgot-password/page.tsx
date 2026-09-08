import { KeyRound } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

// See app/order/page.tsx — must not be statically prerendered, or the CSP
// nonce baked into its inline scripts goes stale and breaks hydration.
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-stone-950 px-4 py-16">
      <div className="w-full max-w-sm animate-fade-slide-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-900/30">
            <KeyRound size={22} strokeWidth={2.25} />
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">Flicks &amp; Licks</p>
          <h1 className="mt-2 text-2xl font-semibold text-stone-50">Reset your password</h1>
          <p className="mt-1 text-sm text-stone-400">Enter your email and we&apos;ll send you a reset link.</p>
        </div>
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 shadow-xl shadow-black/30">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
