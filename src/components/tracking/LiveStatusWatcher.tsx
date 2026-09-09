"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const TERMINAL_STATUSES = new Set(["DELIVERED", "COMPLETED", "CANCELLED", "REJECTED", "REFUNDED"]);

/**
 * Renders nothing — subscribes to this order's full-lifecycle status feed
 * (api/realtime/order/[orderId]/status) and calls router.refresh() the
 * moment it changes, so the track page's server-rendered status pill,
 * banner, and timeline (page.tsx) update live without the customer having
 * to manually reload. Deliberately doesn't duplicate any of that rendering
 * logic client-side — refresh just re-runs the Server Component with fresh
 * data, the same pattern useLiveDeliveryLocation's SSE feed follows for GPS.
 */
export function LiveStatusWatcher({ orderId, token, status }: { orderId: string; token: string; status: string }) {
  const router = useRouter();
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    if (TERMINAL_STATUSES.has(statusRef.current)) return;

    const source = new EventSource(`/api/realtime/order/${orderId}/status?token=${encodeURIComponent(token)}`);
    source.onmessage = (event) => {
      let data: { type: string; status?: string };
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (data.type !== "order.status_changed" || !data.status) return;

      if (data.status !== statusRef.current) {
        router.refresh();
      }
      if (TERMINAL_STATUSES.has(data.status)) {
        source.close();
      }
    };

    return () => source.close();
  }, [orderId, token, router]);

  return null;
}
