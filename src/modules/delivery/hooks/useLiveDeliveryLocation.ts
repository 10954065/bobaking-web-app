"use client";

import { useEffect, useState } from "react";

export type ConnectionState = "connecting" | "live" | "reconnecting" | "stopped";

export interface LiveLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number;
  recordedAt: string;
}

/** Beyond this, a technically-still-connected feed is showing an old fix — surfaced distinctly from "disconnected" (Phase 10/11: "Location temporarily unavailable, last updated 38 seconds ago" vs. "Trying to reconnect..."). */
const STALE_AFTER_MS = 30_000;
const STALE_CHECK_INTERVAL_MS = 5_000;

/**
 * Subscribes to one order's live-location SSE feed
 * (api/realtime/order/[orderId]/location — see that route for the
 * authorization rules) and exposes connection health + staleness alongside
 * the latest fix, so every surface that shows a rider on a map (customer
 * tracking, admin monitoring) gets the same honest "is this actually live
 * right now" signal instead of quietly showing a stale position as current.
 */
export function useLiveDeliveryLocation(orderId: string | null, token?: string) {
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [location, setLocation] = useState<LiveLocation | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Reset to "connecting" the moment we're about to subscribe to a
  // different delivery — adjusted during render (React's documented
  // alternative to a leading setState inside the effect below) rather than
  // as the first statement of the effect, which would cause an extra render.
  const subscriptionKey = orderId ? `${orderId}:${token ?? ""}` : null;
  const [lastSubscriptionKey, setLastSubscriptionKey] = useState(subscriptionKey);
  if (subscriptionKey !== lastSubscriptionKey) {
    setLastSubscriptionKey(subscriptionKey);
    setConnection("connecting");
  }

  useEffect(() => {
    if (!orderId) return;

    const url = token
      ? `/api/realtime/order/${orderId}/location?token=${encodeURIComponent(token)}`
      : `/api/realtime/order/${orderId}/location`;
    const source = new EventSource(url);

    source.onopen = () => setConnection("live");
    source.onerror = () => setConnection((prev) => (prev === "stopped" ? prev : "reconnecting"));
    source.onmessage = (event) => {
      let data: { type: string } & Record<string, unknown>;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === "location.updated") {
        setLocation({
          latitude: data.latitude as number,
          longitude: data.longitude as number,
          heading: (data.heading as number | null) ?? null,
          speed: (data.speed as number | null) ?? null,
          accuracy: data.accuracy as number,
          recordedAt: data.recordedAt as string,
        });
        setConnection("live");
      } else if (data.type === "status.changed") {
        setOrderStatus(data.status as string);
      } else if (data.type === "tracking.stopped") {
        setConnection("stopped");
        source.close();
      }
    };

    return () => source.close();
  }, [orderId, token]);

  // A ticking clock, not a derived boolean — isStale itself is computed
  // below during render from (location, now), so there's nothing to
  // synchronize via setState in this effect at all.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), STALE_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const isStale = location ? now - new Date(location.recordedAt).getTime() > STALE_AFTER_MS : false;

  return { connection, location, orderStatus, isStale };
}
