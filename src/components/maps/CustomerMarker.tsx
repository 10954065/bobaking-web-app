"use client";

import { useMapMarker } from "@/components/maps/useMapMarker";

function createElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "map-marker map-marker-customer";
  el.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", "Delivery address");
  return el;
}

export function CustomerMarker({ latitude, longitude }: { latitude: number; longitude: number }) {
  useMapMarker({ createElement, latitude, longitude, zIndex: 10 });
  return null;
}
