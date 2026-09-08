"use client";

import { useEffect, useState } from "react";
import { X, Radio, WifiOff } from "lucide-react";
import { DeliveryMap } from "@/components/maps/DeliveryMap";
import { RestaurantMarker } from "@/components/maps/RestaurantMarker";
import { CustomerMarker } from "@/components/maps/CustomerMarker";
import { RiderMarker } from "@/components/maps/RiderMarker";
import { DeliveryRoute } from "@/components/maps/DeliveryRoute";
import { MapControls } from "@/components/maps/MapControls";
import { useLiveDeliveryLocation } from "@/modules/delivery/hooks/useLiveDeliveryLocation";
import { getAdminDeliveryNavigationAction, getAdminDeliveryPointsAction } from "@/modules/delivery/actions/tracking.actions";
import type { DeliveryRoute as DeliveryRouteResult } from "@/modules/delivery/services/routing.service";

interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Staff-only live map for one delivery — see api/realtime/order/[orderId]/location's authorization (delivery.read for this order's branch, or the assigned rider). No token: the staff session itself is the credential. */
export function AdminDeliveryMapPanel({
  orderId,
  orderNumber,
  customerName,
  initialStatus,
  onClose,
}: {
  orderId: string;
  orderNumber: string;
  customerName: string;
  initialStatus: string;
  onClose: () => void;
}) {
  const { connection, location, orderStatus, isStale } = useLiveDeliveryLocation(orderId);
  const status = orderStatus ?? initialStatus;
  const [navigation, setNavigation] = useState<{
    destination: Coordinates;
    destinationLabel: "restaurant" | "customer";
    route: DeliveryRouteResult;
  } | null>(null);
  const [points, setPoints] = useState<{ branchCoordinates: Coordinates | null; customerCoordinates: Coordinates | null }>({
    branchCoordinates: null,
    customerCoordinates: null,
  });

  useEffect(() => {
    getAdminDeliveryPointsAction(orderId).then(setPoints);
    getAdminDeliveryNavigationAction(orderId).then((result) => {
      if (!result) return;
      setNavigation({ destination: result.destination, destinationLabel: result.destinationLabel, route: result.route });
    });
  }, [orderId]);

  const fitPoints = [
    points.branchCoordinates && { longitude: points.branchCoordinates.longitude, latitude: points.branchCoordinates.latitude },
    points.customerCoordinates && { longitude: points.customerCoordinates.longitude, latitude: points.customerCoordinates.latitude },
    location && { longitude: location.longitude, latitude: location.latitude },
  ].filter((p): p is { longitude: number; latitude: number } => !!p);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-stone-800 bg-stone-900">
        <div className="flex items-center justify-between border-b border-stone-800 px-4 py-3">
          <div>
            <p className="font-mono text-sm font-bold text-brand-red-400">{orderNumber}</p>
            <p className="text-xs text-stone-400">{customerName}</p>
          </div>
          <div className="flex items-center gap-2">
            {connection === "live" && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                <Radio size={11} className="animate-pulse" /> Live
              </span>
            )}
            {(connection === "connecting" || connection === "reconnecting") && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-950/60 px-2.5 py-1 text-xs font-semibold text-amber-400">
                <WifiOff size={11} /> {connection === "connecting" ? "Connecting…" : "Reconnecting…"}
              </span>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-stone-100">
              <X size={18} />
            </button>
          </div>
        </div>

        {fitPoints.length > 0 ? (
          <DeliveryMap fitPoints={fitPoints} fitKey={fitPoints.length} className="h-80 w-full">
            {points.branchCoordinates && (
              <RestaurantMarker latitude={points.branchCoordinates.latitude} longitude={points.branchCoordinates.longitude} />
            )}
            {points.customerCoordinates && (
              <CustomerMarker latitude={points.customerCoordinates.latitude} longitude={points.customerCoordinates.longitude} />
            )}
            {location && <RiderMarker latitude={location.latitude} longitude={location.longitude} heading={location.heading} />}
            {navigation && <DeliveryRoute geometry={navigation.route.geometry} isEstimate={navigation.route.isEstimate} />}
            <MapControls />
          </DeliveryMap>
        ) : (
          <div className="flex h-80 items-center justify-center text-sm text-stone-500">
            {connection === "stopped" ? "This delivery is no longer live-trackable." : "Waiting for the rider's location…"}
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 text-xs text-stone-400">
          <span>Status: {status.replaceAll("_", " ")}</span>
          {location && <span>{isStale ? "Stale — " : ""}Last update {new Date(location.recordedAt).toLocaleTimeString()}</span>}
          {navigation && (
            <span className="font-medium text-stone-200">
              {navigation.route.etaMinutesLow}–{navigation.route.etaMinutesHigh} min · {navigation.route.distanceKm.toFixed(1)} km
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
