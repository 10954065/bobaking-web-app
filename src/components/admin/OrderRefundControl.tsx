"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { refundOrderAction } from "@/modules/pos/actions/pos.actions";

export function OrderRefundControl({ paymentId, remaining }: { paymentId: string; remaining: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (done) {
    return <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Refunded</span>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:border-red-400 hover:text-red-700 dark:border-stone-700 dark:text-stone-300 dark:hover:border-red-900 dark:hover:text-red-400"
      >
        <RotateCcw size={12} /> Refund
      </button>
    );
  }

  function handleConfirm() {
    setError(null);
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > remaining) {
      setError(`Enter an amount up to GHS ${remaining.toFixed(2)}.`);
      return;
    }
    startTransition(async () => {
      try {
        await refundOrderAction(paymentId, parsed, reason);
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Refund failed.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-stone-200 bg-stone-50 p-2 dark:border-stone-700 dark:bg-stone-800/60">
      {error && <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-stone-500 dark:text-stone-400">GHS</span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          className="w-20 rounded border border-stone-300 bg-white px-1.5 py-1 text-xs text-stone-900 outline-none focus:border-brand-red dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
        />
      </div>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="rounded border border-stone-300 bg-white px-1.5 py-1 text-xs text-stone-900 outline-none focus:border-brand-red dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
      />
      <div className="flex gap-1.5">
        <button
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="flex-1 rounded border border-stone-300 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="flex-1 rounded bg-red-600 py-1 text-[11px] font-semibold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {isPending ? "Refunding…" : "Confirm"}
        </button>
      </div>
    </div>
  );
}
