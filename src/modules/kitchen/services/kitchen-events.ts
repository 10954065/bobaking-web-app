import { getRedisPublisher, createRedisSubscriber } from "@/lib/redis";

export type KitchenEvent =
  | { type: "order.new"; orderId: string }
  | { type: "order.updated"; orderId: string }
  | { type: "order.item_updated"; orderId: string; orderItemId: string };

function channelName(branchId: string): string {
  return `kitchen:${branchId}`;
}

/**
 * Realtime is additive, never load-bearing: every KDS/POS view fetches its
 * own state from the database first and this only pushes incremental
 * updates on top (see the SSE route handler) — a Redis or connection hiccup
 * degrades to "refresh to see the latest," not a broken page.
 */
export async function publishKitchenEvent(branchId: string, event: KitchenEvent): Promise<void> {
  await getRedisPublisher().publish(channelName(branchId), JSON.stringify(event));
}

/** Returns an unsubscribe function that must be called to release the dedicated connection this opens. */
export function subscribeToKitchenEvents(branchId: string, onEvent: (event: KitchenEvent) => void): () => void {
  const subscriber = createRedisSubscriber();
  subscriber.subscribe(channelName(branchId)).catch(() => {
    // Connection issue — the caller's SSE stream will simply receive no live events until reconnect.
  });
  subscriber.on("message", (_channel, message) => {
    try {
      onEvent(JSON.parse(message) as KitchenEvent);
    } catch {
      // Malformed payload — ignore rather than crash the stream.
    }
  });
  return () => {
    subscriber.disconnect();
  };
}
