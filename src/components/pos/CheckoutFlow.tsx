"use client";

import { useState, useTransition } from "react";
import {
  checkoutAction,
  initiatePaymentAction,
  confirmCashPaymentAction,
  devSimulateMobileMoneySuccessAction,
  sendToKitchenAction,
} from "@/modules/pos/actions/pos.actions";
import { previewPromotionCodeAction } from "@/modules/promotions/actions/promotion.actions";
import { previewPointsRedemptionAction } from "@/modules/loyalty/actions/loyalty.actions";

type Stage = "confirm" | "payment-method" | "payment-pending" | "complete";

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  discountTotal: number;
}

interface PaymentSummary {
  id: string;
  provider: string;
  status: string;
}

export function CheckoutFlow({
  cartId,
  branchId,
  customerId,
  subtotal,
  deliveryAddressId,
  onClose,
  onOrderComplete,
}: {
  cartId: string;
  branchId: string;
  customerId: string;
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

  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [isPromoPending, startPromoTransition] = useTransition();

  const [pointsInput, setPointsInput] = useState("");
  const [pointsMessage, setPointsMessage] = useState<string | null>(null);
  const [appliedPoints, setAppliedPoints] = useState(0);
  const [isPointsPending, startPointsTransition] = useTransition();

  function handleApplyPromo() {
    if (!promoCode.trim()) return;
    setPromoMessage(null);
    startPromoTransition(async () => {
      const result = await previewPromotionCodeAction({ code: promoCode, branchId, customerId, subtotal });
      setPromoMessage(result.message);
      setAppliedPromoCode(result.valid ? promoCode.trim() : null);
    });
  }

  function handleApplyPoints() {
    const points = Number(pointsInput);
    if (!points || points <= 0) return;
    setPointsMessage(null);
    startPointsTransition(async () => {
      const result = await previewPointsRedemptionAction(customerId, points);
      setPointsMessage(result.message);
      setAppliedPoints(result.valid ? points : 0);
    });
  }

  function handlePlaceOrder() {
    setError(null);
    startTransition(async () => {
      try {
        const idempotencyKey = `pos-checkout-${cartId}`;
        const created = await checkoutAction({
          cartId,
          idempotencyKey,
          deliveryAddressId,
          promotionCode: appliedPromoCode ?? undefined,
          redeemPoints: appliedPoints > 0 ? appliedPoints : undefined,
        });
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

            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-medium text-stone-400">Promo code</label>
              <div className="flex gap-2">
                <input
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    setAppliedPromoCode(null);
                    setPromoMessage(null);
                  }}
                  placeholder="e.g. WELCOME10"
                  className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-orange-500"
                />
                <button
                  onClick={handleApplyPromo}
                  disabled={isPromoPending || !promoCode.trim()}
                  className="whitespace-nowrap rounded-lg border border-stone-700 px-3 py-2 text-sm font-medium text-stone-200 hover:border-orange-600 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
              {promoMessage && (
                <p className={`text-xs ${appliedPromoCode ? "text-emerald-400" : "text-red-400"}`}>{promoMessage}</p>
              )}
            </div>

            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-medium text-stone-400">Redeem loyalty points</label>
              <div className="flex gap-2">
                <input
                  value={pointsInput}
                  onChange={(e) => {
                    setPointsInput(e.target.value);
                    setAppliedPoints(0);
                    setPointsMessage(null);
                  }}
                  type="number"
                  min="0"
                  placeholder="e.g. 20"
                  className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-orange-500"
                />
                <button
                  onClick={handleApplyPoints}
                  disabled={isPointsPending || !pointsInput}
                  className="whitespace-nowrap rounded-lg border border-stone-700 px-3 py-2 text-sm font-medium text-stone-200 hover:border-orange-600 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
              {pointsMessage && (
                <p className={`text-xs ${appliedPoints > 0 ? "text-emerald-400" : "text-red-400"}`}>{pointsMessage}</p>
              )}
            </div>

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
            {order.discountTotal > 0 && (
              <p className="mt-1 text-sm text-emerald-400">Discount applied: -GHS {order.discountTotal.toFixed(2)}</p>
            )}
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
