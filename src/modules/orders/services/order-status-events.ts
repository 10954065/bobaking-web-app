import { getRedisPublisher, createRedisSubscriber } from "@/lib/redis";
import type { OrderStatus } from "@prisma/client";

/**
 * Every status transition, for the whole order lifecycle — not just the
 * delivery-phase subset delivery-location-events.ts cares about for the map.
 * Same trust model as that module and kitchen-events.ts: the channel name
 * alone is not the security boundary, clients never talk to Redis directly —
 * see api/realtime/order/[orderId]/status for the actual access control.
 */
export type OrderStatusEvent = { type: "order.status_changed"; status: OrderStatus };

function channelName(orderId: string): string {
  return `order-status:${orderId}`;
}

export async function publishOrderStatusEvent(orderId: string, event: OrderStatusEvent): Promise<void> {
  await getRedisPublisher().publish(channelName(orderId), JSON.stringify(event));
}

/** Returns an unsubscribe function that must be called to release the dedicated connection this opens. */
export function subscribeToOrderStatusEvents(orderId: string, onEvent: (event: OrderStatusEvent) => void): () => void {
  const subscriber = createRedisSubscriber();
  subscriber.subscribe(channelName(orderId)).catch(() => {
    // Connection issue — the caller's SSE stream will simply receive no live events until reconnect.
  });
  subscriber.on("message", (_channel, message) => {
    try {
      onEvent(JSON.parse(message) as OrderStatusEvent);
    } catch {
      // Malformed payload — ignore rather than crash the stream.
    }
  });
  return () => {
    subscriber.disconnect();
  };
}
