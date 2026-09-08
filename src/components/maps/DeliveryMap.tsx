"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MapLibreMap, LngLatBounds, setWorkerUrl } from "maplibre-gl";
import { MAP_STYLE_URL } from "@/modules/delivery/providers/map-config";
import { MapInstanceContext } from "@/components/maps/MapContext";

// MapLibre's default worker-URL auto-detection (built for Webpack/Vite)
// resolves to an empty string under Turbopack, which silently breaks all
// tile loading — the map never fires 'load' and nothing ever renders, with
// no console error. Pointing it at static copies of the worker + its shared
// chunk (kept in sync by scripts/copy-maplibre-worker.mjs, see that file)
// is MapLibre's own documented escape hatch for bundlers it doesn't
// auto-detect. Must run before the first `new MapLibreMap(...)`.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export interface LngLat {
  longitude: number;
  latitude: number;
}

/**
 * Base map surface. Owns the one MapLibre GL instance for this view and
 * hands it to children (<RestaurantMarker>, <CustomerMarker>, <RiderMarker>,
 * <DeliveryRoute>, <MapControls>) via context, so this component itself
 * knows nothing about delivery domain concepts — it is the swappable
 * "MapProvider" the routing/mapping abstraction calls for.
 *
 * `fitPoints` is only applied when the *set* of points meaningfully changes
 * (compared by a cheap join-string, not deep-equal) — passing a rider's
 * every GPS ping in here would re-fit/rejar the viewport on every update,
 * which is exactly the jumpy experience Phase 8 says to avoid. Callers that
 * want to force a re-fit (e.g. a "recenter" button) should change `fitKey`.
 */
export function DeliveryMap({
  fitPoints,
  fitKey,
  className = "",
  interactive = true,
  children,
}: {
  fitPoints: LngLat[];
  fitKey?: string | number;
  className?: string;
  interactive?: boolean;
  children?: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: fitPoints[0] ? [fitPoints[0].longitude, fitPoints[0].latitude] : [0, 0],
      zoom: fitPoints[0] ? 13 : 1,
      interactive,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.on("load", () => setMapInstance(map));

    return () => {
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
    // Intentionally mount-once: the map instance itself is not recreated when
    // props change, only updated imperatively (see the fit-bounds effect
    // below and each marker/route child) — recreating the WebGL context on
    // every render would flash/reset the user's pan and zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapInstance || fitPoints.length === 0) return;
    if (fitPoints.length === 1) {
      mapInstance.easeTo({ center: [fitPoints[0]!.longitude, fitPoints[0]!.latitude], zoom: 14, duration: 600 });
      return;
    }
    const bounds = fitPoints.reduce(
      (acc, point) => acc.extend([point.longitude, point.latitude]),
      new LngLatBounds([fitPoints[0]!.longitude, fitPoints[0]!.latitude], [fitPoints[0]!.longitude, fitPoints[0]!.latitude])
    );
    mapInstance.fitBounds(bounds, { padding: 64, duration: 600, maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, fitKey]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-stone-200 dark:bg-stone-900 ${className}`}>
      <MapInstanceContext.Provider value={mapInstance}>{mapInstance && children}</MapInstanceContext.Provider>
    </div>
  );
}
