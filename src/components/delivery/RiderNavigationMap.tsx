"use client";

import { useEffect, useRef, useState } from "react";
import { Store, MapPinned } from "lucide-react";
import { DeliveryMap } from "@/components/maps/DeliveryMap";
import { RestaurantMarker } from "@/components/maps/RestaurantMarker";
import { CustomerMarker } from "@/components/maps/CustomerMarker";
import { RiderMarker } from "@/components/maps/RiderMarker";
import { DeliveryRoute } from "@/components/maps/DeliveryRoute";
import { MapControls } from "@/components/maps/MapControls";
import { getRiderNavigationAction } from "@/modules/delivery/actions/rider.actions";
import { shouldRecalculateRoute, type DeliveryRoute as DeliveryRouteResult } from "@/modules/delivery/services/routing.service";
import type { RiderLocationFix } from "@/modules/delivery/hooks/useRiderLocationTracker";

const ROUTE_REFRESH_INTERVAL_MS = 60_000;

interface Coordinates {
  latitude: number;
  longitude: number;
}

/** The rider's own in-app map: where they are, where they're headed (branch until pickup, then the customer), and the road route between. Uses the rider's own GPS fix directly rather than the SSE feed — it's the same device, no round trip needed. */
export function RiderNavigationMap({ orderId, selfLocation }: { orderId: string; selfLocation: RiderLocationFix | null }) {
  const [navigation, setNavigation] = useState<{ destination: Coordinates; destinationLabel: "restaurant" | "customer"; route: DeliveryRouteResult } | null>(
    null
  );
  const lastRouteOriginRef = useRef<Coordinates | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const result = await getRiderNavigationAction(orderId);
      if (cancelled || !result) return;
      setNavigation({ destination: result.destination, destinationLabel: result.destinationLabel, route: result.route });
      lastRouteOriginRef.current = result.origin;
    }

    refresh();
    const interval = setInterval(refresh, ROUTE_REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId]);

  useEffect(() => {
    if (!selfLocation || !lastRouteOriginRef.current) return;
    if (!shouldRecalculateRoute(lastRouteOriginRef.current, selfLocation)) return;
    getRiderNavigationAction(orderId).then((result) => {
      if (!result) return;
      setNavigation({ destination: result.destination, destinationLabel: result.destinationLabel, route: result.route });
      lastRouteOriginRef.current = result.origin;
    });
  }, [selfLocation, orderId]);

  const fitPoints = [
    selfLocation && { longitude: selfLocation.longitude, latitude: selfLocation.latitude },
    navigation && { longitude: navigation.destination.longitude, latitude: navigation.destination.latitude },
  ].filter((p): p is { longitude: number; latitude: number } => !!p);

  if (fitPoints.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-stone-800 bg-stone-900 text-xs text-stone-500">
        Waiting for GPS to plot the route…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-800">
      <DeliveryMap fitPoints={fitPoints} fitKey={navigation?.destinationLabel} className="h-48 w-full">
        {selfLocation && <RiderMarker latitude={selfLocation.latitude} longitude={selfLocation.longitude} heading={selfLocation.heading} />}
        {navigation?.destinationLabel === "restaurant" && (
          <RestaurantMarker latitude={navigation.destination.latitude} longitude={navigation.destination.longitude} />
        )}
        {navigation?.destinationLabel === "customer" && (
          <CustomerMarker latitude={navigation.destination.latitude} longitude={navigation.destination.longitude} />
        )}
        {navigation && <DeliveryRoute geometry={navigation.route.geometry} isEstimate={navigation.route.isEstimate} />}
        <MapControls />
      </DeliveryMap>

      {navigation && (
        <div className="flex items-center gap-2 border-t border-stone-800 bg-stone-900 px-3.5 py-2.5 text-xs text-stone-300">
          {navigation.destinationLabel === "restaurant" ? <Store size={13} className="text-orange-500" /> : <MapPinned size={13} className="text-blue-500" />}
          <span>{navigation.destinationLabel === "restaurant" ? "To the restaurant" : "To the customer"}</span>
          <span className="ml-auto font-semibold text-stone-100">
            {navigation.route.etaMinutesLow}–{navigation.route.etaMinutesHigh} min · {navigation.route.distanceKm.toFixed(1)} km
          </span>
        </div>
      )}
    </div>
  );
}
