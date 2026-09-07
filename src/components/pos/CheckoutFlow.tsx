"use client";

import { useState, useTransition } from "react";
import {
  checkoutAction,
  initiatePaymentAction,
  confirmCashPaymentAction,
  devSimulateMobileMoneySuccessAction,
  sendToKitchenAction,
} from "@/modules/pos/actions/pos.actions";

type Stage = "confirm" | "payment-method" | "payment-pending" | "complete";

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
}

interface PaymentSummary {
  id: string;
  provider: string;
  status: string;
}

export function CheckoutFlow({
  cartId,
  subtotal,
  deliveryAddressId,
  onClose,
  onOrderComplete,
}: {
  cartId: string;
  subtotal: number;
  deliveryAddressId?: string;
  onClose: () => void;
  onOrderComplete: () => void;
}) {
  const [stage, setStage] = useState<Stage>("confirm");
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [payment, setPayment] = useState<PaymentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePlaceOrder() {
    setError(null);
    startTransition(async () => {
      try {
        const idempotencyKey = `pos-checkout-${cartId}`;
        const created = await checkoutAction({ cartId, idempotencyKey, deliveryAddressId });
        setOrder(created);
        setStage("payment-method");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to place order.");
      }
    });
  }

  function handlePayment(method: "CASH" | "MOBILE_MONEY") {
    if (!order) return;
    setError(null);
    startTransition(async () => {
      try {
        const created = await initiatePaymentAction({ orderId: order.id, method });
        setPayment(created);
        setStage("payment-pending");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to initiate payment.");
      }
    });
  }

  function handleConfirmCash() {
    if (!payment || !order) return;
    startTransition(async () => {
      await confirmCashPaymentAction(payment.id);
      await sendToKitchenAction(order.id);
      setStage("complete");
    });
  }

  function handleSimulateMomo() {
    if (!payment || !order) return;
    startTransition(async () => {
      await devSimulateMobileMoneySuccessAction(payment.id);
      await sendToKitchenAction(order.id);
      setStage("complete");
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-stone-800 bg-stone-900 p-6">
        {error && <p className="mb-4 rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}

        {stage === "confirm" && (
          <>
            <h2 className="text-lg font-semibold text-stone-50">Confirm order</h2>
            <p className="mt-2 text-sm text-stone-400">Subtotal: GHS {subtotal.toFixed(2)} (tax applied at checkout)</p>
            <div className="mt-6 flex gap-2">
              <button onClick={onClose} className="w-full rounded-lg border border-stone-700 py-2.5 text-sm text-stone-300 hover:bg-stone-800">
                Cancel
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={isPending}
                className="w-full rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50"
              >
                {isPending ? "Placing…" : "Place order"}
              </button>
            </div>
          </>
        )}

        {stage === "payment-method" && order && (
          <>
            <h2 className="text-lg font-semibold text-stone-50">Order {order.orderNumber}</h2>
            <p className="mt-1 text-sm text-stone-400">Total: GHS {order.total.toFixed(2)}</p>
            <p className="mt-4 text-sm font-medium text-stone-300">Choose a payment method</p>
            <div className="mt-3 space-y-2">
              <button
                onClick={() => handlePayment("CASH")}
                disabled={isPending}
                className="w-full rounded-lg border border-stone-700 py-2.5 text-sm font-medium text-stone-200 hover:border-orange-600 disabled:opacity-50"
              >
                Cash
              </button>
              <button
                onClick={() => handlePayment("MOBILE_MONEY")}
                disabled={isPending}
                className="w-full rounded-lg border border-stone-700 py-2.5 text-sm font-medium text-stone-200 hover:border-orange-600 disabled:opacity-50"
              >
                Mobile Money
              </button>
            </div>
          </>
        )}

        {stage === "payment-pending" && payment && order && (
          <>
            <h2 className="text-lg font-semibold text-stone-50">Order {order.orderNumber}</h2>
            {payment.provider === "cash" ? (
              <>
                <p className="mt-2 text-sm text-stone-400">Collect GHS {order.total.toFixed(2)} in cash from the customer.</p>
                <button
                  onClick={handleConfirmCash}
                  disabled={isPending}
                  className="mt-5 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  Confirm cash received
                </button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-stone-400">Waiting for the customer to complete payment on their phone…</p>
                <p className="mt-4 rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
                  DEV: no real Mobile Money gateway is connected yet. Use this button to simulate the customer completing payment.
                </p>
                <button
                  onClick={handleSimulateMomo}
                  disabled={isPending}
                  className="mt-3 w-full rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  DEV: Simulate payment success
                </button>
              </>
            )}
          </>
        )}

        {stage === "complete" && order && (
          <>
            <h2 className="text-lg font-semibold text-emerald-400">Order {order.orderNumber} confirmed</h2>
            <p className="mt-2 text-sm text-stone-400">Total: GHS {order.total.toFixed(2)}</p>
            <p className="mt-1 text-sm text-stone-400">Sent for kitchen preparation once accepted.</p>
            <button
              onClick={onOrderComplete}
              className="mt-6 w-full rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white hover:bg-orange-500"
            >
              New order
            </button>
          </>
        )}
      </div>
    </div>
  );
}
