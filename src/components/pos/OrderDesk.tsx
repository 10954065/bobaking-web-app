"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Inbox, Receipt, Send, Banknote, Smartphone, Clock, CircleDollarSign, PlusCircle, XCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  listIncomingOrdersAction,
  listTodaysOrdersAction,
  type IncomingOrder,
  type TodaysOrdersSummary,
} from "@/modules/orders/actions/order-desk.actions";
import { sendToKitchenAction, confirmCashPaymentAction, rejectOrderAction } from "@/modules/pos/actions/pos.actions";
import { playNewOrderChime } from "@/lib/notification-chime";

const REFRESH_MS = 6000;

const TYPE_LABELS: Record<string, string> = { DELIVERY: "Delivery", PICKUP: "Pickup", DINE_IN: "Dine-in" };

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
}

export function OrderDesk({ onNewOrder }: { onNewOrder: () => void }) {
  const [tab, setTab] = useState<"incoming" | "today">("incoming");
  const [incoming, setIncoming] = useState<IncomingOrder[]>([]);
  const [today, setToday] = useState<TodaysOrdersSummary | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // null (not an empty Map) means "haven't fetched yet" — distinguishes a
  // genuinely empty first load from a later poll, so mounting onto an
  // already-full incoming queue doesn't chime for every pre-existing order.
  // Tracks status per id (not just id membership) so the same chime also
  // fires when an already-seen order flips to READY — the kitchen finishing
  // it doesn't change its id, only its status.
  const seenOrderStatuses = useRef<Map<string, string> | null>(null);

  const handleIncomingOrders = useCallback((orders: IncomingOrder[]) => {
    setIncoming(orders);
    const previous = seenOrderStatuses.current;
    if (previous) {
      const hasNotableChange = orders.some((o) => {
        const previousStatus = previous.get(o.id);
        return previousStatus === undefined || (o.status === "READY" && previousStatus !== "READY");
      });
      if (hasNotableChange) playNewOrderChime();
    }
    seenOrderStatuses.current = new Map(orders.map((o) => [o.id, o.status]));
  }, []);

  const refetch = useCallback(() => {
    listIncomingOrdersAction()
      .then(handleIncomingOrders)
      .catch(() => {});
    listTodaysOrdersAction()
      .then(setToday)
      .catch(() => {});
  }, [handleIncomingOrders]);

  useEffect(() => {
    refetch();
    const id = setInterval(refetch, REFRESH_MS);
    return () => clearInterval(id);
  }, [refetch]);

  // Every handler below follows the same shape: clear any previous error,
  // run the action, and — whether it succeeds or throws — always clear
  // pendingId in finally. Without that a transient failure (the same class
  // of DB timeout this app has hit repeatedly) left the clicked button
  // stuck disabled ("Sending…"/"Declining…") with no way to recover short
  // of reloading the page, and the thrown error went completely unseen.
  function handleSendToKitchen(orderId: string) {
    setActionError(null);
    setPendingId(orderId);
    startTransition(async () => {
      try {
        await sendToKitchenAction(orderId);
        refetch();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Couldn't send that order to the kitchen.");
      } finally {
        setPendingId(null);
      }
    });
  }

  function handleConfirmCash(paymentId: string) {
    setActionError(null);
    setPendingId(paymentId);
    startTransition(async () => {
      try {
        await confirmCashPaymentAction(paymentId);
        refetch();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Couldn't confirm that cash payment.");
      } finally {
        setPendingId(null);
      }
    });
  }

  function handleDecline(orderId: string) {
    setActionError(null);
    setPendingId(orderId);
    startTransition(async () => {
      try {
        await rejectOrderAction(orderId, declineReason);
        refetch();
        setDecliningId(null);
        setDeclineReason("");
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Couldn't decline that order.");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-stone-800 bg-stone-900 p-1">
          <button
            onClick={() => setTab("incoming")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
              tab === "incoming" ? "bg-brand-red-600 text-white" : "text-stone-400 hover:text-stone-100"
            }`}
          >
            <Inbox size={14} /> Incoming{incoming.length > 0 && ` (${incoming.length})`}
          </button>
          <button
            onClick={() => setTab("today")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
              tab === "today" ? "bg-brand-red-600 text-white" : "text-stone-400 hover:text-stone-100"
            }`}
          >
            <Receipt size={14} /> Today
          </button>
        </div>
        <button
          onClick={onNewOrder}
          className="flex items-center gap-1.5 rounded-xl border border-stone-700 px-3.5 py-2 text-sm font-medium text-stone-300 transition-colors hover:border-brand-red-600 hover:text-brand-red-400"
        >
          <PlusCircle size={15} /> New phone order
        </button>
      </div>

      {actionError && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-900/60 bg-red-950/30 px-3.5 py-3 text-sm text-red-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p className="flex-1">{actionError}</p>
          <button onClick={() => setActionError(null)} className="shrink-0 text-xs font-medium text-red-400 hover:text-red-200">
            Dismiss
          </button>
        </div>
      )}

      {tab === "incoming" && (
        <div className="mt-4 space-y-3">
          {incoming.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-800 bg-stone-900 px-4 py-14 text-center">
              <Inbox size={28} className="text-stone-600" />
              <p className="text-sm text-stone-400">No orders waiting on payment, kitchen relay, or pickup right now.</p>
            </div>
          )}
          <AnimatePresence initial={false}>
            {incoming.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex flex-col gap-3 rounded-xl border border-stone-800 bg-stone-900 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-brand-red-400">{order.orderNumber}</span>
                    <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[11px] font-medium text-stone-400">
                      {TYPE_LABELS[order.type] ?? order.type}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-stone-300">
                    {order.customerName} · {order.itemCount} item(s) · GHS {order.total.toFixed(2)}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
                    <Clock size={11} /> {timeAgo(order.createdAt)}
                    {order.paymentMethod && (
                      <span className="ml-1 flex items-center gap-1">
                        · {order.paymentMethod === "CASH" ? <Banknote size={11} /> : <Smartphone size={11} />}
                        {order.paymentMethod.replaceAll("_", " ").toLowerCase()}
                      </span>
                    )}
                  </p>
                </div>

                {order.status === "CONFIRMED" && decliningId === order.id && (
                  <div className="flex shrink-0 flex-col gap-2 sm:w-64">
                    <input
                      autoFocus
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      placeholder="Reason (e.g. out of stock)"
                      className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-red-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setDecliningId(null);
                          setDeclineReason("");
                        }}
                        className="flex-1 rounded-lg border border-stone-700 px-3 py-2 text-xs font-medium text-stone-300 hover:bg-stone-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDecline(order.id)}
                        disabled={pendingId === order.id}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                      >
                        {pendingId === order.id ? "Declining…" : "Confirm decline"}
                      </button>
                    </div>
                  </div>
                )}
                {order.status === "CONFIRMED" && decliningId !== order.id && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => setDecliningId(order.id)}
                      disabled={pendingId === order.id}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-red-900/60 px-3 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-950/40 disabled:opacity-50"
                    >
                      <XCircle size={14} /> Decline
                    </button>
                    <button
                      onClick={() => handleSendToKitchen(order.id)}
                      disabled={pendingId === order.id}
                      className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
                    >
                      <Send size={14} /> {pendingId === order.id ? "Sending…" : "Accept · Send to kitchen"}
                    </button>
                  </div>
                )}
                {order.status === "PENDING_PAYMENT" && order.paymentMethod === "CASH" && order.paymentId && (
                  <button
                    onClick={() => handleConfirmCash(order.paymentId!)}
                    disabled={pendingId === order.paymentId}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <CircleDollarSign size={14} /> {pendingId === order.paymentId ? "Confirming…" : "Confirm cash received"}
                  </button>
                )}
                {order.status === "PENDING_PAYMENT" && order.paymentMethod !== "CASH" && (
                  <span className="shrink-0 rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs font-medium text-amber-300">
                    Awaiting customer payment
                  </span>
                )}
                {order.status === "READY" && (
                  <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 size={14} /> Ready for {order.type === "PICKUP" ? "pickup" : "handoff"}
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {tab === "today" && today && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
              <p className="text-xs text-stone-500">Orders today</p>
              <p className="mt-1 text-2xl font-bold text-stone-50">{today.totalOrders}</p>
            </div>
            <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
              <p className="text-xs text-stone-500">Collected</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">GHS {today.totalCollected.toFixed(2)}</p>
            </div>
            <div className="col-span-2 rounded-xl border border-stone-800 bg-stone-900 p-4 sm:col-span-1">
              <p className="text-xs text-stone-500">By method</p>
              <div className="mt-1 space-y-0.5 text-sm text-stone-300">
                {Object.entries(today.byMethod).length === 0 && <p className="text-stone-600">No payments yet</p>}
                {Object.entries(today.byMethod).map(([method, amount]) => (
                  <p key={method}>
                    {method.replaceAll("_", " ")}: <span className="font-semibold text-stone-100">GHS {amount.toFixed(2)}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900">
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-stone-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Order</th>
                    <th className="px-4 py-2.5 font-medium">Customer</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Total</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {today.orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-2.5 font-mono text-brand-red-400">{order.orderNumber}</td>
                      <td className="px-4 py-2.5 text-stone-300">{order.customerName}</td>
                      <td className="px-4 py-2.5 text-stone-400">{TYPE_LABELS[order.type] ?? order.type}</td>
                      <td className="px-4 py-2.5 text-stone-300">GHS {order.total.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-stone-400">{order.status.replaceAll("_", " ")}</td>
                    </tr>
                  ))}
                  {today.orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-stone-500">
                        No orders yet today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
