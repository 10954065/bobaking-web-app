"use client";

import { createContext, useContext } from "react";
import type { MapLibreMap } from "maplibre-gl";

/**
 * Shares the single MapLibre Map instance owned by <DeliveryMap> with its
 * marker/route children, so each marker is its own small React component
 * (matching the app's usual component boundaries) while still all drawing
 * onto one map — mirrors how react-map-gl/react-leaflet expose the
 * underlying map instance to child overlays.
 */
export const MapInstanceContext = createContext<MapLibreMap | null>(null);

export function useMapInstance(): MapLibreMap | null {
  return useContext(MapInstanceContext);
}
