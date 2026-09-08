import { getRedisPublisher, createRedisSubscriber } from "@/lib/redis";
import type { DeliveryLocationSnapshot } from "@/modules/delivery/services/delivery-location.service";

/**
 * Per-order (not per-branch) so a subscription is naturally scoped to one
 * delivery — but the channel name alone is NOT the security boundary,
 * clients never talk to Redis directly. The real access control happens in
 * the SSE route handler (see api/realtime/order/[orderId]/location), which
 * decides whether a given request is even allowed to open this
 * subscription — same trust model as delivery-events.ts/kitchen-events.ts.
 */
export type DeliveryLocationEvent =
  | ({ type: "location.updated" } & DeliveryLocationSnapshot)
  | { type: "status.changed"; status: string }
  | { type: "tracking.stopped" };

function channelName(orderId: string): string {
  return `delivery-location:${orderId}`;
}

export async function publishDeliveryLocationEvent(orderId: string, event: DeliveryLocationEvent): Promise<void> {
  await getRedisPublisher().publish(channelName(orderId), JSON.stringify(event));
}

/** Returns an unsubscribe function that must be called to release the dedicated connection this opens. */
export function subscribeToDeliveryLocationEvents(orderId: string, onEvent: (event: DeliveryLocationEvent) => void): () => void {
  const subscriber = createRedisSubscriber();
  subscriber.subscribe(channelName(orderId)).catch(() => {
    // Connection issue — the caller's SSE stream will simply receive no live events until reconnect.
  });
  subscriber.on("message", (_channel, message) => {
    try {
      onEvent(JSON.parse(message) as DeliveryLocationEvent);
    } catch {
      // Malformed payload — ignore rather than crash the stream.
    }
  });
  return () => {
    subscriber.disconnect();
  };
}
