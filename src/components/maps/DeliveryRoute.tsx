"use client";

import { useEffect, useRef } from "react";
import type { GeoJSONSource } from "maplibre-gl";
import { useMapInstance } from "@/components/maps/MapContext";

const SOURCE_ID = "delivery-route";
const LAYER_ID = "delivery-route-line";

function toGeoJson(geometry: [number, number][]): GeoJSON.Feature<GeoJSON.LineString> {
  return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: geometry } };
}

/**
 * Renders the road route as a GeoJSON line layer. `isEstimate` switches to a
 * dashed line — see routing.service.ts's fallback (a straight-line estimate
 * used when the routing provider is unreachable) — so the map is honest
 * about the difference between a real road route and a rough guess.
 */
export function DeliveryRoute({ geometry, isEstimate = false }: { geometry: [number, number][]; isEstimate?: boolean }) {
  const map = useMapInstance();
  const readyRef = useRef(false);

  useEffect(() => {
    if (!map) return;

    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, { type: "geojson", data: toGeoJson(geometry) });
      map.addLayer({
        id: LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ea580c", "line-width": 4, "line-opacity": 0.85 },
      });
      readyRef.current = true;
    }

    return () => {
      // Best-effort — see MapControls.tsx's cleanup for why this can throw
      // harmlessly when the whole map is torn down in the same unmount batch.
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        // Ignore — see above.
      }
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    if (!map || !readyRef.current) return;
    (map.getSource(SOURCE_ID) as GeoJSONSource | undefined)?.setData(toGeoJson(geometry));
  }, [map, geometry]);

  useEffect(() => {
    if (!map || !readyRef.current || !map.getLayer(LAYER_ID)) return;
    map.setPaintProperty(LAYER_ID, "line-dasharray", isEstimate ? [1.5, 1.5] : [1, 0]);
  }, [map, isEstimate]);

  return null;
}
