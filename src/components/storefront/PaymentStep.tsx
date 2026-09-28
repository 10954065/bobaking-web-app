"use client";

import { useState, useTransition } from "react";
import { Banknote, Smartphone, CreditCard, CheckCircle2 } from "lucide-react";
import {
  initiateStorefrontPaymentAction,
  simulateStorefrontPaymentAction,
  type StorefrontOrderSummary,
} from "@/modules/storefront/actions/storefront.actions";

export function PaymentStep({
  order,
  cardPaymentsEnabled = false,
  onDone,
}: {
  order: StorefrontOrderSummary;
  cardPaymentsEnabled?: boolean;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<"method" | "momo-pending" | "redirecting" | "done">("method");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [paymentId, setPaymentId] = useState<string | null>(null);

  function handlePay(method: "CASH" | "MOBILE_MONEY" | "CARD") {
    setError(null);
    startTransition(async () => {
      try {
        const payment = await initiateStorefrontPaymentAction({ orderId: order.id, method });
        if (method === "CASH") {
          setStage("done");
          return;
        }
        // A real gateway (Paystack) hands back its own hosted checkout page —
        // no dev-simulate step, the customer actually pays on that page and
        // Paystack's webhook (api/webhooks/paystack) confirms it from here.
        // Card always takes this branch — there's no dev stand-in for it.
        if (payment.redirectUrl) {
          setStage("redirecting");
          window.location.href = payment.redirectUrl;
          return;
        }
        setPaymentId(payment.id);
        setStage("momo-pending");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't start payment.");
      }
    });
  }

  function handleSimulate() {
    if (!paymentId) return;
    setError(null);
    startTransition(async () => {
      try {
        await simulateStorefrontPaymentAction(paymentId);
        setStage("done");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't confirm payment.");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 text-center">
      {stage === "method" && (
        <>
          <h1 className="font-display text-2xl uppercase tracking-tight text-brand-ink">Order {order.orderNumber} placed</h1>
          <p className="mt-1 text-sm text-brand-ink/55">Total: GHS {order.total.toFixed(2)}</p>
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <p className="mt-6 text-left text-sm font-medium text-brand-ink/70">Choose a payment method</p>
          <div className="mt-3 space-y-2.5">
            <button
              onClick={() => handlePay("MOBILE_MONEY")}
              disabled={isPending}
              className="flex w-full items-center gap-3 rounded-xl border border-brand-ink/12 bg-white px-4 py-3.5 text-left transition-colors hover:border-brand-red disabled:opacity-50"
            >
              <Smartphone size={18} className="text-brand-red" />
              <div>
                <p className="text-sm font-semibold text-brand-ink">Mobile Money</p>
                <p className="text-xs text-brand-ink/45">Pay now on your phone</p>
              </div>
            </button>
            {cardPaymentsEnabled && (
              <button
                onClick={() => handlePay("CARD")}
                disabled={isPending}
                className="flex w-full items-center gap-3 rounded-xl border border-brand-ink/12 bg-white px-4 py-3.5 text-left transition-colors hover:border-brand-red disabled:opacity-50"
              >
                <CreditCard size={18} className="text-brand-red" />
                <div>
                  <p className="text-sm font-semibold text-brand-ink">Card</p>
                  <p className="text-xs text-brand-ink/45">Pay by debit or credit card</p>
                </div>
              </button>
            )}
            <button
              onClick={() => handlePay("CASH")}
              disabled={isPending}
              className="flex w-full items-center gap-3 rounded-xl border border-brand-ink/12 bg-white px-4 py-3.5 text-left transition-colors hover:border-brand-red disabled:opacity-50"
            >
              <Banknote size={18} className="text-brand-red" />
              <div>
                <p className="text-sm font-semibold text-brand-ink">Cash</p>
                <p className="text-xs text-brand-ink/45">Pay the rider or at the counter</p>
              </div>
            </button>
          </div>
        </>
      )}

      {stage === "momo-pending" && (
        <>
          <h1 className="font-display text-2xl uppercase tracking-tight text-brand-ink">Complete payment on your phone</h1>
          <p className="mt-2 text-sm text-brand-ink/55">
            Approve the GHS {order.total.toFixed(2)} Mobile Money prompt to confirm your order.
          </p>
          <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            DEV: no real Mobile Money gateway is connected yet. Use this button to simulate approving the prompt.
          </p>
          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button
            onClick={handleSimulate}
            disabled={isPending}
            className="mt-4 w-full rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
          >
            {isPending ? "Confirming…" : "DEV: Simulate payment success"}
          </button>
        </>
      )}

      {stage === "redirecting" && (
        <>
          <h1 className="font-display text-2xl uppercase tracking-tight text-brand-ink">Taking you to checkout…</h1>
          <p className="mt-2 text-sm text-brand-ink/55">Complete the GHS {order.total.toFixed(2)} payment there, then you&apos;ll be brought back here.</p>
        </>
      )}

      {stage === "done" && (
        <>
          <CheckCircle2 size={40} className="mx-auto text-emerald-600" />
          <h1 className="mt-3 font-display text-2xl uppercase tracking-tight text-brand-ink">Order placed!</h1>
          <p className="mt-1 text-sm text-brand-ink/55">
            We&apos;ve sent order {order.orderNumber} to the branch.
          </p>
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            The branch hasn&apos;t accepted it yet. Payment alone doesn&apos;t confirm your order. Track its status below.
          </p>
          <button
            onClick={onDone}
            className="mt-6 w-full rounded-xl bg-brand-red py-3 text-sm font-semibold text-white shadow-lg shadow-brand-red/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Track my order
          </button>
        </>
      )}
    </div>
  );
}
