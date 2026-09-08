import { useEffect, useRef } from "react";
import { Marker } from "maplibre-gl";
import { useMapInstance } from "@/components/maps/MapContext";

/**
 * Creates one imperative MapLibre marker and keeps it in sync with
 * (latitude, longitude, rotation) — MapLibre markers aren't React-rendered,
 * so each marker component supplies a `createElement` factory (a stable,
 * module-level function — see RiderMarker.tsx etc.) and this hook builds
 * the actual DOM node *inside* the effect, then owns its lifecycle against
 * the shared map instance. Building it inside the effect (rather than
 * accepting a pre-built element as a prop) keeps the node a genuinely local
 * value the hook is free to mutate imperatively (required for MapLibre) —
 * mutating something passed in as a prop/argument is a real anti-pattern.
 *
 * `smooth: true` adds a CSS transition on the marker element's transform,
 * so a position update (e.g. the rider's next GPS ping) glides the marker
 * to its new spot instead of jumping — Phase 8's "do NOT make the rider
 * marker jump unnecessarily."
 */
export function useMapMarker(params: {
  createElement: () => HTMLElement;
  latitude: number;
  longitude: number;
  rotation?: number;
  smooth?: boolean;
  zIndex?: number;
}) {
  const map = useMapInstance();
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!map) return;
    const element = params.createElement();
    if (params.smooth) {
      element.style.transition = "transform 900ms linear";
    }
    if (params.zIndex != null) {
      element.style.zIndex = String(params.zIndex);
    }
    const marker = new Marker({ element, rotationAlignment: "map" }).setLngLat([params.longitude, params.latitude]).addTo(map);
    if (params.rotation != null) marker.setRotation(params.rotation);
    markerRef.current = marker;

    return () => {
      // Best-effort — see MapControls.tsx's cleanup for why this can throw
      // harmlessly when the whole map is torn down in the same unmount batch.
      try {
        marker.remove();
      } catch {
        // Ignore — see above.
      }
      markerRef.current = null;
    };
    // Marker is created once per map instance; position/rotation updates
    // below are imperative so they don't tear down and recreate the DOM
    // element (which would kill the CSS transition mid-flight).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    markerRef.current?.setLngLat([params.longitude, params.latitude]);
  }, [params.latitude, params.longitude]);

  useEffect(() => {
    if (params.rotation != null) markerRef.current?.setRotation(params.rotation);
  }, [params.rotation]);
}
