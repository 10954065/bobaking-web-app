import type { NextRequest } from "next/server";
import { prisma } from "@/db/client";
import { getCurrentSession } from "@/modules/auth/services/current-session.service";
import { getUserAccessProfile, hasPermission } from "@/modules/auth/services/authorization.service";
import { subscribeToOrderStatusEvents } from "@/modules/orders/services/order-status-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_INTERVAL_MS = 25_000;

/** Once an order reaches one of these there's nothing left to watch for — mirrors TRACKING_STOPS_AT in order.service.ts plus the two other terminal states that never touch delivery tracking at all. */
const TERMINAL_STATUSES = new Set(["DELIVERED", "COMPLETED", "CANCELLED", "REJECTED", "REFUNDED"]);

/**
 * Same two ways to be authorized as the delivery-location feed (see that
 * route's doc comment), minus the rider case — a rider has no reason to
 * watch an order's full lifecycle status, only its delivery phase.
 */
async function isAuthorized(order: { branchId: string; trackingToken: string }, request: NextRequest) {
  const session = await getCurrentSession();
  if (session?.user) {
    const profile = await getUserAccessProfile(session.user.id);
    if (hasPermission(profile, "orders", "read", order.branchId)) return true;
  }

  const token = request.nextUrl.searchParams.get("token");
  return !!token && token === order.trackingToken;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, branchId: true, trackingToken: true, status: true },
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

      if (TERMINAL_STATUSES.has(order.status)) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "order.status_changed", status: order.status })}\n\n`));
        controller.close();
        return;
      }

      unsubscribe = subscribeToOrderStatusEvents(orderId, (event) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        if (TERMINAL_STATUSES.has(event.status)) {
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
