"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPinned } from "lucide-react";
import { getDeliveryBoardAction, assignRiderToOrderAction, type DeliveryBoardData } from "@/modules/delivery/actions/board.actions";
import { AdminDeliveryMapPanel } from "@/components/delivery/AdminDeliveryMapPanel";

const STATUS_COLORS: Record<string, string> = {
  READY: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  ASSIGNED_TO_RIDER: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  PICKED_UP: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
};

const RIDER_STATUS_COLORS: Record<string, string> = {
  OFFLINE: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  AVAILABLE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  ON_DELIVERY: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
};

export function DeliveryBoard({
  branchId,
  branchName,
  branches,
  initialBoard,
  canAssign,
}: {
  branchId: string;
  branchName: string;
  branches: { id: string; name: string }[];
  initialBoard: DeliveryBoardData;
  canAssign: boolean;
}) {
  const router = useRouter();
  const [board, setBoard] = useState(initialBoard);
  const [assigning, setAssigning] = useState<Record<string, string>>({});
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<{ id: string; orderNumber: string; customerName: string; status: string } | null>(
    null
  );
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(() => {
    getDeliveryBoardAction(branchId)
      .then(setBoard)
      .catch(() => {
        // A failed background refetch just leaves the board stale until the next event or manual refresh.
      });
  }, [branchId]);

  const debouncedRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(refetch, 250);
  }, [refetch]);

  useEffect(() => {
    const source = new EventSource(`/api/realtime/delivery/${branchId}`);
    source.onmessage = () => debouncedRefetch();
    return () => source.close();
  }, [branchId, debouncedRefetch]);

  const availableRiders = board.riders.filter((r) => r.status === "AVAILABLE");

  async function handleAssign(orderId: string) {
    const riderUserId = assigning[orderId];
    if (!riderUserId) return;
    setPendingOrderId(orderId);
    try {
      await assignRiderToOrderAction(orderId, riderUserId);
      refetch();
    } finally {
      setPendingOrderId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Delivery — {branchName}</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">Live board — updates automatically as orders and riders change.</p>
        </div>
        <nav className="flex gap-2">
          <Link
            href="/admin/delivery/riders"
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Riders
          </Link>
          <Link
            href="/admin/delivery/zones"
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Zones
          </Link>
        </nav>
      </div>

      {branches.length > 1 && (
        <div className="mb-4 flex gap-1">
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => router.push(`/admin/delivery?branch=${b.id}`)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                b.id === branchId
                  ? "bg-orange-600 text-white"
                  : "bg-white text-stone-600 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800"
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      <section className="mb-8 rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <h3 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">
          Ready for delivery ({board.ready.length})
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
              <tr>
                <th className="px-6 py-2 font-medium">Order</th>
                <th className="px-6 py-2 font-medium">Customer</th>
                <th className="px-6 py-2 font-medium">Address</th>
                <th className="px-6 py-2 font-medium">Items</th>
                <th className="px-6 py-2 font-medium">Total</th>
                {canAssign && <th className="px-6 py-2 font-medium">Assign rider</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {board.ready.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">{order.orderNumber}</td>
                  <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{order.customerName}</td>
                  <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{order.addressLabel}</td>
                  <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{order.itemCount}</td>
                  <td className="px-6 py-3 text-stone-600 dark:text-stone-400">GHS {order.total.toFixed(2)}</td>
                  {canAssign && (
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={assigning[order.id] ?? ""}
                          onChange={(e) => setAssigning((prev) => ({ ...prev, [order.id]: e.target.value }))}
                          className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                        >
                          <option value="">Select rider…</option>
                          {availableRiders.map((rider) => (
                            <option key={rider.userId} value={rider.userId}>
                              {rider.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssign(order.id)}
                          disabled={!assigning[order.id] || pendingOrderId === order.id}
                          className="rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-orange-600 dark:hover:bg-orange-500"
                        >
                          Assign
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {board.ready.length === 0 && (
                <tr>
                  <td colSpan={canAssign ? 6 : 5} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                    Nothing waiting for a rider right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <h3 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">
          Active deliveries ({board.active.length})
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
              <tr>
                <th className="px-6 py-2 font-medium">Order</th>
                <th className="px-6 py-2 font-medium">Customer</th>
                <th className="px-6 py-2 font-medium">Rider</th>
                <th className="px-6 py-2 font-medium">Status</th>
                <th className="px-6 py-2 font-medium">Map</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {board.active.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">{order.orderNumber}</td>
                  <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{order.customerName}</td>
                  <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{order.assignedRiderName ?? "—"}</td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[order.status] ?? ""}`}>
                      {order.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() =>
                        setTrackingOrder({ id: order.id, orderNumber: order.orderNumber, customerName: order.customerName, status: order.status })
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                    >
                      <MapPinned size={12} /> Track
                    </button>
                  </td>
                </tr>
              ))}
              {board.active.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                    No deliveries in progress.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <h3 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">Riders ({board.riders.length})</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
              <tr>
                <th className="px-6 py-2 font-medium">Rider</th>
                <th className="px-6 py-2 font-medium">Status</th>
                <th className="px-6 py-2 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {board.riders.map((rider) => (
                <tr key={rider.userId}>
                  <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">{rider.name}</td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${RIDER_STATUS_COLORS[rider.status] ?? ""}`}>
                      {rider.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                    {rider.lastLocationAt ? new Date(rider.lastLocationAt).toLocaleTimeString() : "Never"}
                  </td>
                </tr>
              ))}
              {board.riders.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                    No riders at this branch yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {trackingOrder && (
        <AdminDeliveryMapPanel
          orderId={trackingOrder.id}
          orderNumber={trackingOrder.orderNumber}
          customerName={trackingOrder.customerName}
          initialStatus={trackingOrder.status}
          onClose={() => setTrackingOrder(null)}
        />
      )}
    </main>
  );
}
