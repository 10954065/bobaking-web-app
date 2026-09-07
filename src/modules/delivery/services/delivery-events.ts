import { getRedisPublisher, createRedisSubscriber } from "@/lib/redis";

export type DeliveryEvent =
  | { type: "order.ready"; orderId: string }
  | { type: "order.assigned"; orderId: string; riderId: string }
  | { type: "order.updated"; orderId: string }
  | { type: "rider.status_changed"; riderId: string }
  | { type: "rider.location_updated"; riderId: string };

function channelName(branchId: string): string {
  return `delivery:${branchId}`;
}

/**
 * Realtime is additive, never load-bearing — same rule as kitchen-events.ts:
 * every delivery view (admin board, rider app) fetches its own state from
 * the database first and this only pushes incremental "something changed,
 * refetch" signals on top.
 */
export async function publishDeliveryEvent(branchId: string, event: DeliveryEvent): Promise<void> {
  await getRedisPublisher().publish(channelName(branchId), JSON.stringify(event));
}

/** Returns an unsubscribe function that must be called to release the dedicated connection this opens. */
export function subscribeToDeliveryEvents(branchId: string, onEvent: (event: DeliveryEvent) => void): () => void {
  const subscriber = createRedisSubscriber();
  subscriber.subscribe(channelName(branchId)).catch(() => {
    // Connection issue — the caller's SSE stream will simply receive no live events until reconnect.
  });
  subscriber.on("message", (_channel, message) => {
    try {
      onEvent(JSON.parse(message) as DeliveryEvent);
    } catch {
      // Malformed payload — ignore rather than crash the stream.
    }
  });
  return () => {
    subscriber.disconnect();
  };
}
