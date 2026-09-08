"use client";

import { useMapMarker } from "@/components/maps/useMapMarker";

function createElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "map-marker map-marker-restaurant";
  el.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M17 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z"/></svg>';
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", "Restaurant");
  return el;
}

export function RestaurantMarker({ latitude, longitude }: { latitude: number; longitude: number }) {
  useMapMarker({ createElement, latitude, longitude, zIndex: 10 });
  return null;
}
