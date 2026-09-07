"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startItemAction, markItemReadyAction, getKitchenQueueAction } from "@/modules/kitchen/actions/kitchen.actions";
import type { KdsOrderWithItems } from "@/modules/kitchen/services/kitchen-order.service";

interface KitchenBoardProps {
  branchId: string;
  branchName: string;
  branches: { id: string; name: string }[];
  initialOrders: KdsOrderWithItems[];
}

const COLUMNS = [
  { status: "SENT_TO_KITCHEN", label: "NEW" },
  { status: "PREPARING", label: "PREPARING" },
  { status: "READY", label: "READY" },
] as const;

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.6);
  } catch {
    // Audio isn't critical to the KDS working — ignore if unsupported/blocked.
  }
}

function elapsedLabel(createdAt: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")} elapsed`;
}

export function KitchenBoard({ branchId, branchName, branches, initialOrders }: KitchenBoardProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<KdsOrderWithItems[]>(initialOrders);
  const [now, setNow] = useState(() => Date.now());
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(() => {
    getKitchenQueueAction(branchId)
      .then(setOrders)
      .catch(() => {
        // A failed background refetch just means the board is stale until the next event or manual refresh.
      });
  }, [branchId]);

  const debouncedRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(refetch, 250);
  }, [refetch]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const source = new EventSource(`/api/realtime/kitchen/${branchId}`);
    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as { type: string };
        if (parsed.type === "order.new") playChime();
        debouncedRefetch();
      } catch {
        // Ignore malformed events.
      }
    };
    return () => source.close();
  }, [branchId, debouncedRefetch]);

  async function handleStart(orderItemId: string) {
    setPendingItemId(orderItemId);
    try {
      await startItemAction(orderItemId);
      refetch();
    } finally {
      setPendingItemId(null);
    }
  }

  async function handleReady(orderItemId: string) {
    setPendingItemId(orderItemId);
    try {
      await markItemReadyAction(orderItemId);
      refetch();
    } finally {
      setPendingItemId(null);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-stone-950 text-stone-100">
      <header className="flex items-center justify-between border-b border-stone-800 px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">Flicks &amp; Licks</p>
          <h1 className="text-xl font-semibold">Kitchen Display — {branchName}</h1>
        </div>
        {branches.length > 1 && (
          <select
            defaultValue={branchId}
            onChange={(e) => router.push(`/kitchen?branch=${e.target.value}`)}
            className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </header>

      <div className="grid flex-1 grid-cols-3 gap-4 overflow-hidden p-4">
        {COLUMNS.map((column) => {
          const columnOrders = orders.filter((o) => o.status === column.status);
          return (
            <div key={column.status} className="flex flex-col overflow-hidden rounded-xl border border-stone-800 bg-stone-900/40">
              <div className="border-b border-stone-800 px-4 py-3">
                <h2 className="text-sm font-bold tracking-wide text-stone-300">
                  {column.label} <span className="text-stone-500">({columnOrders.length})</span>
                </h2>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-3">
                {columnOrders.map((order) => (
                  <div key={order.id} className="rounded-lg border border-stone-800 bg-stone-900 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-lg font-bold text-orange-400">{order.orderNumber}</span>
                      <span className="text-xs uppercase text-stone-500">{order.type}</span>
                    </div>
                    <ul className="space-y-2">
                      {order.items.map((item) => (
                        <li key={item.id} className="rounded-md bg-stone-800/60 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              {item.quantity} × {item.productName}
                              {item.stationSlug && (
                                <span className="ml-2 rounded bg-stone-700 px-1.5 py-0.5 text-[10px] uppercase text-stone-300">
                                  {item.stationSlug}
                                </span>
                              )}
                            </span>
                            {item.kitchenStatus === "PENDING" && (
                              <button
                                onClick={() => handleStart(item.id)}
                                disabled={pendingItemId === item.id}
                                className="rounded bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                              >
                                Start
                              </button>
                            )}
                            {item.kitchenStatus === "PREPARING" && (
                              <button
                                onClick={() => handleReady(item.id)}
                                disabled={pendingItemId === item.id}
                                className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                              >
                                Ready
                              </button>
                            )}
                            {item.kitchenStatus === "READY" && <span className="text-xs font-semibold text-emerald-400">✓ Ready</span>}
                          </div>
                          {item.modifiers.length > 0 && (
                            <p className="mt-1 text-xs text-stone-400">{item.modifiers.join(", ")}</p>
                          )}
                          {item.notes && <p className="mt-1 text-xs italic text-amber-400">Note: {item.notes}</p>}
                        </li>
                      ))}
                    </ul>
                    {order.notes && <p className="mt-2 text-xs italic text-amber-400">Order note: {order.notes}</p>}
                    <p className="mt-3 text-xs font-medium text-stone-500">{elapsedLabel(order.createdAt, now)}</p>
                  </div>
                ))}
                {columnOrders.length === 0 && <p className="p-3 text-sm text-stone-600">No orders</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
