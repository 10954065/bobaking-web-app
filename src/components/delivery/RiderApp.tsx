"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMyDeliveriesAction,
  toggleAvailabilityAction,
  pingLocationAction,
  markPickedUpAction,
  markDeliveredAction,
  type RiderDeliveryOrder,
} from "@/modules/delivery/actions/rider.actions";

const LOCATION_PING_INTERVAL_MS = 20_000;

export function RiderApp({
  branchId,
  riderName,
  initialStatus,
  initialDeliveries,
}: {
  branchId: string;
  riderName: string;
  initialStatus: string;
  initialDeliveries: RiderDeliveryOrder[];
}) {
  const [status, setStatus] = useState(initialStatus);
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isTogglePending, setTogglePending] = useState(false);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOnline = status !== "OFFLINE";

  const refetch = useCallback(() => {
    getMyDeliveriesAction()
      .then(setDeliveries)
      .catch(() => {
        // A failed background refetch just leaves the list stale until the next event or manual refresh.
      });
  }, []);

  const debouncedRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(refetch, 250);
  }, [refetch]);

  useEffect(() => {
    const source = new EventSource(`/api/realtime/delivery/${branchId}`);
    source.onmessage = () => debouncedRefetch();
    return () => source.close();
  }, [branchId, debouncedRefetch]);

  // Pings this rider's live position periodically while online — the admin
  // board and public tracking page both read RiderProfile.currentLatitude/
  // Longitude, updated here. Geolocation being unavailable/denied is not
  // fatal to the rider app working, just to the live-position feature.
  useEffect(() => {
    if (!isOnline || typeof navigator === "undefined" || !navigator.geolocation) return;

    function ping() {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationError(null);
          pingLocationAction({ latitude: position.coords.latitude, longitude: position.coords.longitude }).catch(() => {});
        },
        () => setLocationError("Location unavailable — enable location access to share live position."),
        { enableHighAccuracy: true, timeout: 10_000 }
      );
    }

    ping();
    const interval = setInterval(ping, LOCATION_PING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isOnline]);

  async function handleToggle() {
    setTogglePending(true);
    try {
      const result = await toggleAvailabilityAction(!isOnline);
      setStatus(result.status);
    } finally {
      setTogglePending(false);
    }
  }

  async function handlePickedUp(orderId: string) {
    setPendingOrderId(orderId);
    try {
      await markPickedUpAction(orderId);
      refetch();
    } finally {
      setPendingOrderId(null);
    }
  }

  async function handleDelivered(orderId: string) {
    setPendingOrderId(orderId);
    try {
      await markDeliveredAction(orderId);
      // markDeliveredAction also flips the rider back to AVAILABLE server-side
      // (see rider.service.ts setRiderStatus) — mirror that locally so the
      // online/offline toggle doesn't stay stuck on "On delivery".
      setStatus("AVAILABLE");
      refetch();
    } finally {
      setPendingOrderId(null);
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="flex items-center justify-between border-b border-stone-800 px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">Flicks &amp; Licks</p>
          <h1 className="text-lg font-semibold">{riderName}</h1>
        </div>
        <button
          onClick={handleToggle}
          disabled={isTogglePending || status === "ON_DELIVERY"}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
            isOnline ? "bg-emerald-600 hover:bg-emerald-500" : "bg-stone-800 hover:bg-stone-700"
          }`}
        >
          {status === "ON_DELIVERY" ? "On delivery" : isOnline ? "Online" : "Offline"}
        </button>
      </header>

      <main className="mx-auto max-w-lg space-y-3 p-4">
        {locationError && (
          <p className="rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">{locationError}</p>
        )}

        {!isOnline && (
          <p className="rounded-lg border border-stone-800 bg-stone-900 px-4 py-6 text-center text-sm text-stone-400">
            Go online to receive delivery assignments.
          </p>
        )}

        {deliveries.length === 0 && isOnline && (
          <p className="rounded-lg border border-stone-800 bg-stone-900 px-4 py-6 text-center text-sm text-stone-400">
            No deliveries assigned right now.
          </p>
        )}

        {deliveries.map((order) => (
          <div key={order.id} className="rounded-xl border border-stone-800 bg-stone-900 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-lg font-bold text-orange-400">{order.orderNumber}</span>
              <span className="text-xs font-semibold text-stone-400">GHS {order.total.toFixed(2)}</span>
            </div>
            <p className="text-sm font-medium text-stone-100">{order.customerName}</p>
            {order.customerPhone && <p className="text-sm text-stone-400">{order.customerPhone}</p>}
            <p className="mt-2 text-sm text-stone-300">{order.addressLabel}</p>
            {order.addressLine2 && <p className="text-sm text-stone-400">{order.addressLine2}</p>}
            {order.landmark && <p className="text-sm italic text-stone-500">Landmark: {order.landmark}</p>}
            <p className="mt-2 text-xs text-stone-500">{order.itemCount} item(s)</p>

            <div className="mt-4">
              {order.status === "ASSIGNED_TO_RIDER" && (
                <button
                  onClick={() => handlePickedUp(order.id)}
                  disabled={pendingOrderId === order.id}
                  className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                >
                  {pendingOrderId === order.id ? "Updating…" : "Picked up from branch"}
                </button>
              )}
              {(order.status === "PICKED_UP" || order.status === "OUT_FOR_DELIVERY") && (
                <button
                  onClick={() => handleDelivered(order.id)}
                  disabled={pendingOrderId === order.id}
                  className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  {pendingOrderId === order.id ? "Updating…" : "Mark delivered"}
                </button>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
