"use client";

import { useMapMarker } from "@/components/maps/useMapMarker";

function createElement(imageUrl: string | null, label: string): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.className = "map-marker-rider-wrap";
  wrap.setAttribute("role", "img");
  wrap.setAttribute("aria-label", label);

  const pulse = document.createElement("span");
  pulse.className = "map-marker-pulse";
  wrap.appendChild(pulse);

  if (imageUrl) {
    // The customer's actual dish, in transit — a photo reads as "your food is
    // coming" far better than a generic bike icon. Never rotated with the
    // rider's heading (see below): a spinning food photo looks broken, not
    // directional.
    const photo = document.createElement("div");
    photo.className = "map-marker map-marker-rider-photo";
    photo.style.backgroundImage = `url(${imageUrl})`;
    wrap.appendChild(photo);
  } else {
    const badge = document.createElement("div");
    badge.className = "map-marker map-marker-rider";
    const arrow = document.createElement("div");
    arrow.className = "map-marker-rider-arrow";
    badge.appendChild(arrow);
    wrap.appendChild(badge);
  }

  return wrap;
}

/**
 * `heading` rotates the whole marker so its arrow points the rider's actual
 * direction of travel when the device reports one (many desktop browsers
 * don't — defaults to north/0 rather than omitting rotation, which would
 * leave a stale rotation from the marker's last real heading). Only applies
 * to the plain arrow badge — a dish photo stays upright regardless of heading.
 */
export function RiderMarker({
  latitude,
  longitude,
  heading,
  dishImageUrl = null,
  dishName = null,
}: {
  latitude: number;
  longitude: number;
  heading?: number | null;
  dishImageUrl?: string | null;
  dishName?: string | null;
}) {
  const label = dishImageUrl && dishName ? `${dishName}, on the way` : "Rider";
  useMapMarker({
    createElement: () => createElement(dishImageUrl, label),
    latitude,
    longitude,
    rotation: dishImageUrl ? 0 : heading ?? 0,
    smooth: true,
    zIndex: 20,
  });
  return null;
}
