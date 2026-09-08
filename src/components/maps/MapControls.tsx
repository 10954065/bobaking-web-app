"use client";

import { useEffect } from "react";
import { NavigationControl } from "maplibre-gl";
import { LocateFixed } from "lucide-react";
import { useMapInstance } from "@/components/maps/MapContext";

/** Zoom/pan controls plus an optional "recenter" button — the one bit of chrome every delivery map view needs, kept out of DeliveryMap itself so a caller that wants a bare map (no chrome) can omit it. */
export function MapControls({ onRecenter }: { onRecenter?: () => void }) {
  const map = useMapInstance();

  useEffect(() => {
    if (!map) return;
    const nav = new NavigationControl({ showCompass: false });
    map.addControl(nav, "top-right");
    return () => {
      // Best-effort: if the whole map is being torn down in the same
      // unmount batch (DeliveryMap's own cleanup calling map.remove()),
      // this control is already gone and removeControl() throws on the
      // now-invalid map — harmless (the DOM node is being destroyed
      // either way) but must never crash the page.
      try {
        map.removeControl(nav);
      } catch {
        // Ignore — see above.
      }
    };
  }, [map]);

  if (!onRecenter) return null;

  return (
    <button
      type="button"
      onClick={onRecenter}
      title="Recenter"
      className="absolute bottom-4 right-4 z-10 flex size-10 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 shadow-lg transition-colors hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
    >
      <LocateFixed size={17} />
    </button>
  );
}
