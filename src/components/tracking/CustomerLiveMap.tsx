"use client";

import { useEffect, useRef, useState } from "react";
import { Radio, WifiOff, Bike } from "lucide-react";
import { DeliveryMap } from "@/components/maps/DeliveryMap";
import { RestaurantMarker } from "@/components/maps/RestaurantMarker";
import { CustomerMarker } from "@/components/maps/CustomerMarker";
import { RiderMarker } from "@/components/maps/RiderMarker";
import { DeliveryRoute } from "@/components/maps/DeliveryRoute";
import { MapControls } from "@/components/maps/MapControls";
import { useLiveDeliveryLocation } from "@/modules/delivery/hooks/useLiveDeliveryLocation";
import { getPublicNavigationAction } from "@/modules/delivery/actions/tracking.actions";
import { shouldRecalculateRoute, type DeliveryRoute as DeliveryRouteResult } from "@/modules/delivery/services/routing.service";
import { distanceMeters } from "@/modules/delivery/services/geo-validation";

const NEARBY_THRESHOLD_METERS = 300;
const ROUTE_REFRESH_INTERVAL_MS = 90_000;

interface Coordinates {
  latitude: number;
  longitude: number;
}

export function CustomerLiveMap({
  orderId,
  trackingToken,
  branchCoordinates,
  customerCoordinates,
  riderFirstName,
}: {
  orderId: string;
  trackingToken: string;
  branchCoordinates: Coordinates | null;
  customerCoordinates: Coordinates | null;
  riderFirstName: string | null;
}) {
  const { connection, location, isStale } = useLiveDeliveryLocation(orderId, trackingToken);
  const [route, setRoute] = useState<DeliveryRouteResult | null>(null);
  const lastRouteOriginRef = useRef<Coordinates | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refreshRoute() {
      const navigation = await getPublicNavigationAction(trackingToken);
      if (cancelled || !navigation) return;
      setRoute(navigation.route);
      lastRouteOriginRef.current = navigation.origin;
    }

    refreshRoute();
    const interval = setInterval(refreshRoute, ROUTE_REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [trackingToken]);

  // Recalculate sooner than the interval once the rider has actually moved
  // enough for the on-screen route to be meaningfully stale (Phase 9) —
  // never on every single ping.
  useEffect(() => {
    if (!location || !lastRouteOriginRef.current) return;
    if (!shouldRecalculateRoute(lastRouteOriginRef.current, location)) return;
    getPublicNavigationAction(trackingToken).then((navigation) => {
      if (!navigation) return;
      setRoute(navigation.route);
      lastRouteOriginRef.current = navigation.origin;
    });
  }, [location, trackingToken]);

  const fitPoints = [
    branchCoordinates && { longitude: branchCoordinates.longitude, latitude: branchCoordinates.latitude },
    customerCoordinates && { longitude: customerCoordinates.longitude, latitude: customerCoordinates.latitude },
    location && { longitude: location.longitude, latitude: location.latitude },
  ].filter((p): p is { longitude: number; latitude: number } => !!p);

  const isNearby =
    !!location && !!customerCoordinates && distanceMeters(location, customerCoordinates) <= NEARBY_THRESHOLD_METERS;

  if (fitPoints.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-stone-200 bg-stone-100 text-sm text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
        Map isn&apos;t available for this delivery yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800">
      <DeliveryMap fitPoints={fitPoints} fitKey={fitPoints.length} className="h-72 w-full sm:h-80">
        {branchCoordinates && <RestaurantMarker latitude={branchCoordinates.latitude} longitude={branchCoordinates.longitude} />}
        {customerCoordinates && <CustomerMarker latitude={customerCoordinates.latitude} longitude={customerCoordinates.longitude} />}
        {location && <RiderMarker latitude={location.latitude} longitude={location.longitude} heading={location.heading} />}
        {route && <DeliveryRoute geometry={route.geometry} isEstimate={route.isEstimate} />}
        <MapControls />
      </DeliveryMap>

      <div className="flex items-center justify-between gap-3 border-t border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
        <div className="min-w-0">
          {isNearby ? (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <Bike size={15} /> {riderFirstName ?? "Your rider"} is nearby
            </p>
          ) : route ? (
            <p className="text-sm text-stone-700 dark:text-stone-300">
              Estimated arrival{" "}
              <span className="font-semibold text-stone-900 dark:text-stone-50">
                {route.etaMinutesLow}–{route.etaMinutesHigh} min
              </span>{" "}
              <span className="text-stone-400 dark:text-stone-500">· {route.distanceKm.toFixed(1)} km</span>
            </p>
          ) : (
            <p className="text-sm text-stone-500 dark:text-stone-400">Calculating route…</p>
          )}
          {location && (
            <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">
              {isStale ? `Location may be out of date — last updated ${new Date(location.recordedAt).toLocaleTimeString()}` : "Live"}
            </p>
          )}
        </div>

        <ConnectionBadge connection={connection} />
      </div>
    </div>
  );
}

function ConnectionBadge({ connection }: { connection: "connecting" | "live" | "reconnecting" | "stopped" }) {
  if (connection === "live") {
    return (
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        <Radio size={11} className="animate-pulse" /> Live
      </span>
    );
  }
  if (connection === "reconnecting" || connection === "connecting") {
    return (
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        <WifiOff size={11} /> Reconnecting…
      </span>
    );
  }
  return null;
}
