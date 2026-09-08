import type { NextRequest } from "next/server";
import { prisma } from "@/db/client";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasPermission } from "@/modules/auth/services/authorization.service";
import { getDeliveryLocation } from "@/modules/delivery/services/delivery-location.service";
import { subscribeToDeliveryLocationEvents } from "@/modules/delivery/services/delivery-location-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_INTERVAL_MS = 25_000;

/**
 * Still counts as "trackable" for streaming purposes at the exact moment a
 * subscriber connects — READY is included so an admin/rider watching the
 * board doesn't get bounced right as a delivery is about to start. Once the
 * status flips to something outside this set mid-stream, transitionOrder
 * (order.service.ts) publishes "tracking.stopped" and this route reacts by
 * ending the stream — see the message handler below.
 */
const STREAMABLE_STATUSES = new Set(["READY", "ASSIGNED_TO_RIDER", "PICKED_UP", "OUT_FOR_DELIVERY"]);

/**
 * Three ways to be authorized to watch one delivery's live GPS, and no
 * others:
 *   1. Staff with `delivery.read` for the order's branch (admin/front-desk monitoring).
 *   2. The rider this order is actually assigned to (their own delivery).
 *   3. Whoever holds the order's trackingToken (the guest customer's private link).
 * A guessed/incremented orderId satisfies none of these on its own — see
 * Order.trackingToken's doc comment for why this isn't gated by orderNumber.
 */
async function isAuthorized(order: { branchId: string; assignedRiderId: string | null; trackingToken: string }, request: NextRequest) {
  const session = await getCurrentSession();
  if (session?.user) {
    if (order.assignedRiderId === session.user.id) return true;
    const profile = await getUserAccessProfile(session.user.id);
    if (hasPermission(profile, "delivery", "read", order.branchId)) return true;
  }

  const token = request.nextUrl.searchParams.get("token");
  return !!token && token === order.trackingToken;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, branchId: true, assignedRiderId: true, trackingToken: true, status: true },
  });
  if (!order) {
    return new Response("Not found", { status: 404 });
  }
  if (!(await isAuthorized(order, request))) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const cleanup = () => {
    unsubscribe?.();
    unsubscribe = null;
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
  };

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`: connected\n\n`));

      if (!STREAMABLE_STATUSES.has(order.status)) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tracking.stopped" })}\n\n`));
        controller.close();
        return;
      }

      // Send the current snapshot immediately so a subscriber that connects
      // between GPS pings sees the rider right away instead of an empty map
      // until the next ping arrives.
      const current = await getDeliveryLocation(orderId);
      if (current) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "location.updated", ...current })}\n\n`));
      }

      unsubscribe = subscribeToDeliveryLocationEvents(orderId, (event) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        if (event.type === "tracking.stopped") {
          cleanup();
          controller.close();
        }
      });

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, HEARTBEAT_INTERVAL_MS);
    },
    cancel: cleanup,
  });

  request.signal.onabort = cleanup;

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}
