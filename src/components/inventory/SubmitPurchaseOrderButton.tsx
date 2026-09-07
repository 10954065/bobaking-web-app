"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitPurchaseOrderAction } from "@/modules/inventory/actions/purchase-order.actions";

export function SubmitPurchaseOrderButton({ purchaseOrderId }: { purchaseOrderId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      await submitPurchaseOrderAction(purchaseOrderId);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={isPending}
      className="rounded-lg bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-700 disabled:opacity-50 dark:bg-orange-600 dark:hover:bg-orange-500"
    >
      {isPending ? "Submitting…" : "Submit to supplier"}
    </button>
  );
}
