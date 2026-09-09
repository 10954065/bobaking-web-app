"use client";

import { useState, useTransition } from "react";
import { Banknote, Smartphone, CheckCircle2 } from "lucide-react";
import {
  initiateStorefrontPaymentAction,
  simulateStorefrontPaymentAction,
  type StorefrontOrderSummary,
} from "@/modules/storefront/actions/storefront.actions";

export function PaymentStep({ order, onDone }: { order: StorefrontOrderSummary; onDone: () => void }) {
  const [stage, setStage] = useState<"method" | "momo-pending" | "done">("method");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [paymentId, setPaymentId] = useState<string | null>(null);

  function handlePay(method: "CASH" | "MOBILE_MONEY") {
    setError(null);
    startTransition(async () => {
      try {
        const payment = await initiateStorefrontPaymentAction({ orderId: order.id, method });
        if (method === "CASH") {
          setStage("done");
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
    startTransition(async () => {
      await simulateStorefrontPaymentAction(paymentId);
      setStage("done");
    });
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 text-center">
      {stage === "method" && (
        <>
          <h1 className="font-display text-2xl uppercase tracking-tight text-stone-50">Order {order.orderNumber} placed</h1>
          <p className="mt-1 text-sm text-stone-400">Total: GHS {order.total.toFixed(2)}</p>
          {error && <p className="mt-4 rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
          <p className="mt-6 text-left text-sm font-medium text-stone-300">Choose a payment method</p>
          <div className="mt-3 space-y-2.5">
            <button
              onClick={() => handlePay("MOBILE_MONEY")}
              disabled={isPending}
              className="flex w-full items-center gap-3 rounded-xl border border-stone-700 px-4 py-3.5 text-left transition-colors hover:border-brand-red disabled:opacity-50"
            >
              <Smartphone size={18} className="text-brand-red-light" />
              <div>
                <p className="text-sm font-semibold text-stone-100">Mobile Money</p>
                <p className="text-xs text-stone-500">Pay now on your phone</p>
              </div>
            </button>
            <button
              onClick={() => handlePay("CASH")}
              disabled={isPending}
              className="flex w-full items-center gap-3 rounded-xl border border-stone-700 px-4 py-3.5 text-left transition-colors hover:border-brand-red disabled:opacity-50"
            >
              <Banknote size={18} className="text-brand-red-light" />
              <div>
                <p className="text-sm font-semibold text-stone-100">Cash</p>
                <p className="text-xs text-stone-500">Pay the rider or at the counter</p>
              </div>
            </button>
          </div>
        </>
      )}

      {stage === "momo-pending" && (
        <>
          <h1 className="font-display text-2xl uppercase tracking-tight text-stone-50">Complete payment on your phone</h1>
          <p className="mt-2 text-sm text-stone-400">
            Approve the GHS {order.total.toFixed(2)} Mobile Money prompt to confirm your order.
          </p>
          <p className="mt-5 rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
            DEV: no real Mobile Money gateway is connected yet. Use this button to simulate approving the prompt.
          </p>
          <button
            onClick={handleSimulate}
            disabled={isPending}
            className="mt-4 w-full rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
          >
            {isPending ? "Confirming…" : "DEV: Simulate payment success"}
          </button>
        </>
      )}

      {stage === "done" && (
        <>
          <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
          <h1 className="mt-3 font-display text-2xl uppercase tracking-tight text-stone-50">Order placed!</h1>
          <p className="mt-1 text-sm text-stone-400">
            We&apos;ve sent order {order.orderNumber} to the branch.
          </p>
          <p className="mt-3 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-300">
            The branch hasn&apos;t accepted it yet — payment alone doesn&apos;t confirm your order. Track its status below.
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
