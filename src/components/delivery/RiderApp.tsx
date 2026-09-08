"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Bike,
  Package,
  MapPin,
  Phone,
  Navigation2,
  CheckCircle2,
  Radio,
  UtensilsCrossed,
  UserRound,
  LogOut,
  Wallet,
  KeyRound,
} from "lucide-react";
import { signOutAction } from "@/modules/auth/actions/sign-out.action";
import {
  getMyDeliveriesAction,
  toggleAvailabilityAction,
  pingLocationAction,
  markPickedUpAction,
  markDeliveredAction,
  getRiderEarningsSummaryAction,
  type RiderDeliveryOrder,
  type RiderEarningsSummary,
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
  const [earnings, setEarnings] = useState<RiderEarningsSummary>({ deliveriesToday: 0, earningsToday: 0 });
  const [codeInputs, setCodeInputs] = useState<Record<string, string>>({});
  const [codeErrors, setCodeErrors] = useState<Record<string, string | null>>({});
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOnline = status !== "OFFLINE";
  const isOnDelivery = status === "ON_DELIVERY";

  const refetch = useCallback(() => {
    getMyDeliveriesAction()
      .then(setDeliveries)
      .catch(() => {
        // A failed background refetch just leaves the list stale until the next event or manual refresh.
      });
    getRiderEarningsSummaryAction()
      .then(setEarnings)
      .catch(() => {});
  }, []);

  useEffect(() => {
    getRiderEarningsSummaryAction()
      .then(setEarnings)
      .catch(() => {});
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
    const code = (codeInputs[orderId] ?? "").trim();
    setPendingOrderId(orderId);
    setCodeErrors((prev) => ({ ...prev, [orderId]: null }));
    try {
      await markDeliveredAction(orderId, code);
      // markDeliveredAction also flips the rider back to AVAILABLE server-side
      // (see rider.service.ts setRiderStatus) — mirror that locally so the
      // online/offline toggle doesn't stay stuck on "On delivery".
      setStatus("AVAILABLE");
      refetch();
    } catch (e) {
      setCodeErrors((prev) => ({ ...prev, [orderId]: e instanceof Error ? e.message : "Couldn't confirm delivery." }));
    } finally {
      setPendingOrderId(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-950 text-stone-100">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-800 bg-stone-950/95 px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white">
            <UtensilsCrossed size={17} strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-500">Flicks &amp; Licks</p>
            <h1 className="truncate text-base font-semibold leading-tight">{riderName}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              isOnline ? "bg-emerald-950/60 text-emerald-400" : "bg-stone-800 text-stone-500"
            }`}
          >
            <Radio size={12} className={isOnline ? "animate-pulse" : ""} />
            {isOnDelivery ? "On delivery" : isOnline ? "Online" : "Offline"}
          </span>
          <Link
            href="/account"
            title="My account"
            className="flex size-8 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-100"
          >
            <UserRound size={16} />
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              title="Sign out"
              className="flex size-8 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-red-950/50 hover:text-red-400"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-4 pt-3">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-stone-800 bg-stone-900 px-3.5 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-950/60 text-emerald-400">
            <Wallet size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-stone-500">Today&apos;s earnings</p>
            <p className="truncate text-sm font-semibold text-stone-50">
              GHS {earnings.earningsToday.toFixed(2)}{" "}
              <span className="font-normal text-stone-500">· {earnings.deliveriesToday} deliveries</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom padding reserves room for the fixed action bar so the last card is never hidden behind it. */}
      <main className="mx-auto w-full max-w-lg flex-1 space-y-3 p-4 pb-28">
        {locationError && (
          <p className="rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">{locationError}</p>
        )}

        {!isOnline && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-800 bg-stone-900 px-4 py-10 text-center">
            <Bike size={28} className="text-stone-600" />
            <p className="text-sm text-stone-400">Go online to start receiving delivery assignments.</p>
          </div>
        )}

        {deliveries.length === 0 && isOnline && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-800 bg-stone-900 px-4 py-10 text-center">
            <Package size={28} className="text-stone-600" />
            <p className="text-sm text-stone-400">No deliveries assigned right now — sit tight.</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {deliveries.map((order) => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-900"
            >
              <div className="flex items-center justify-between border-b border-stone-800/80 px-4 py-3">
                <span className="flex items-center gap-2 font-mono text-lg font-bold text-orange-400">
                  <Package size={16} />
                  {order.orderNumber}
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                  <Wallet size={12} /> +GHS {order.deliveryFee.toFixed(2)}
                </span>
              </div>

              <div className="space-y-2 px-4 py-3">
                <p className="text-sm font-medium text-stone-100">{order.customerName}</p>
                <div className="flex items-start gap-2 text-sm text-stone-300">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-stone-500" />
                  <div>
                    <p>{order.addressLabel}</p>
                    {order.addressLine2 && <p className="text-stone-400">{order.addressLine2}</p>}
                    {order.landmark && <p className="italic text-stone-500">Landmark: {order.landmark}</p>}
                  </div>
                </div>
                <p className="pl-5.75 text-xs text-stone-500">{order.itemCount} item(s)</p>
              </div>

              <div className="flex items-center gap-2 px-4 pb-3">
                {order.customerPhone && (
                  <a
                    href={`tel:${order.customerPhone}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-700 py-2 text-xs font-semibold text-stone-300 transition-colors hover:bg-stone-800"
                  >
                    <Phone size={13} /> Call
                  </a>
                )}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.addressLabel)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-700 py-2 text-xs font-semibold text-stone-300 transition-colors hover:bg-stone-800"
                >
                  <Navigation2 size={13} /> Navigate
                </a>
              </div>

              <div className="px-4 pb-4">
                {order.status === "ASSIGNED_TO_RIDER" && (
                  <button
                    onClick={() => handlePickedUp(order.id)}
                    disabled={pendingOrderId === order.id}
                    className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors active:scale-[0.98] hover:bg-blue-500 disabled:opacity-50"
                  >
                    {pendingOrderId === order.id ? "Updating…" : "Picked up from branch"}
                  </button>
                )}
                {(order.status === "PICKED_UP" || order.status === "OUT_FOR_DELIVERY") && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-stone-400">
                      <KeyRound size={12} /> Ask the customer for their 4-digit code
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={codeInputs[order.id] ?? ""}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                          setCodeInputs((prev) => ({ ...prev, [order.id]: digits }));
                        }}
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="0000"
                        className="w-24 rounded-xl border border-stone-700 bg-stone-950 px-3 py-3 text-center font-mono text-lg tracking-[0.3em] text-stone-100 outline-none focus:border-orange-500"
                      />
                      <button
                        onClick={() => handleDelivered(order.id)}
                        disabled={pendingOrderId === order.id || (codeInputs[order.id] ?? "").length !== 4}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors active:scale-[0.98] hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <CheckCircle2 size={16} />
                        {pendingOrderId === order.id ? "Confirming…" : "Confirm delivered"}
                      </button>
                    </div>
                    {codeErrors[order.id] && <p className="text-xs text-red-400">{codeErrors[order.id]}</p>}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </main>

      {/* Primary control pinned to the thumb-reach zone — this is a phone-only app. */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-800 bg-stone-950/95 px-4 pt-3 backdrop-blur"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={handleToggle}
          disabled={isTogglePending || isOnDelivery}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold transition-colors active:scale-[0.98] disabled:opacity-60 ${
            isOnline ? "bg-stone-800 text-stone-200 hover:bg-stone-700" : "bg-orange-600 text-white hover:bg-orange-500"
          }`}
        >
          <Bike size={19} />
          {isOnDelivery ? "On delivery — finish to go offline" : isTogglePending ? "Updating…" : isOnline ? "Go offline" : "Go online"}
        </button>
      </div>
    </div>
  );
}
