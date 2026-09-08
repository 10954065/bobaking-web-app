"use client";

import { useMapMarker } from "@/components/maps/useMapMarker";

function createElement(): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.className = "map-marker-rider-wrap";
  wrap.setAttribute("role", "img");
  wrap.setAttribute("aria-label", "Rider");

  const pulse = document.createElement("span");
  pulse.className = "map-marker-pulse";
  wrap.appendChild(pulse);

  const badge = document.createElement("div");
  badge.className = "map-marker map-marker-rider";
  const arrow = document.createElement("div");
  arrow.className = "map-marker-rider-arrow";
  badge.appendChild(arrow);
  wrap.appendChild(badge);

  return wrap;
}

/**
 * `heading` rotates the whole marker so its arrow points the rider's actual
 * direction of travel when the device reports one (many desktop browsers
 * don't — defaults to north/0 rather than omitting rotation, which would
 * leave a stale rotation from the marker's last real heading).
 */
export function RiderMarker({ latitude, longitude, heading }: { latitude: number; longitude: number; heading?: number | null }) {
  useMapMarker({ createElement, latitude, longitude, rotation: heading ?? 0, smooth: true, zIndex: 20 });
  return null;
}
