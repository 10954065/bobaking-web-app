import { prisma } from "@/db/client";

const LIVE_TRACKABLE_STATUSES = new Set(["ASSIGNED_TO_RIDER", "PICKED_UP", "OUT_FOR_DELIVERY"]);

export interface PublicOrderTracking {
  /** Internal id — only useful paired with the trackingToken that gated this lookup; see the live-location SSE route. */
  orderId: string;
  orderNumber: string;
  status: string;
  type: string;
  branchName: string;
  branchCoordinates: { latitude: number; longitude: number } | null;
  customerCoordinates: { latitude: number; longitude: number } | null;
  createdAt: string;
  items: { productName: string; quantity: number }[];
  total: number;
  statusHistory: { toStatus: string; createdAt: string }[];
  rider: { firstName: string } | null;
  /** Whether the live map/GPS feed should even be attempted right now — false before a rider is assigned, and false again once delivered/cancelled. */
  isLiveTrackable: boolean;
  /** Read this out to your rider on arrival — only set for DELIVERY orders, and hidden once the handoff is already confirmed. */
  deliveryCode: string | null;
}

/**
 * Reachable by anyone who holds the order's trackingToken — a random,
 * unguessable UUID, deliberately NOT the human-readable orderNumber
 * ("FL-1015" is sequential and guessable). See prisma/schema.prisma's
 * Order.trackingToken doc comment. Must never expose customer PII
 * (name/phone/address), payment details, or the rider's own identity beyond
 * a first name.
 */
export async function getPublicOrderTracking(trackingToken: string): Promise<PublicOrderTracking | null> {
  const order = await prisma.order.findUnique({
    where: { trackingToken },
    include: {
      branch: true,
      deliveryAddress: true,
      items: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
      assignedRider: true,
    },
  });
  if (!order) return null;

  const isLiveTrackable = LIVE_TRACKABLE_STATUSES.has(order.status);

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    type: order.type,
    branchName: order.branch.name,
    branchCoordinates:
      order.branch.latitude != null && order.branch.longitude != null
        ? { latitude: Number(order.branch.latitude), longitude: Number(order.branch.longitude) }
        : null,
    customerCoordinates:
      order.deliveryAddress?.latitude != null && order.deliveryAddress?.longitude != null
        ? { latitude: Number(order.deliveryAddress.latitude), longitude: Number(order.deliveryAddress.longitude) }
        : null,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({ productName: item.productName, quantity: item.quantity })),
    total: Number(order.total),
    statusHistory: order.statusHistory.map((h) => ({ toStatus: h.toStatus, createdAt: h.createdAt.toISOString() })),
    rider: isLiveTrackable && order.assignedRider ? { firstName: order.assignedRider.firstName } : null,
    isLiveTrackable,
    // Once the rider has already punched it in there's nothing left to prove — showing a stale code after DELIVERED would just be confusing.
    deliveryCode: order.deliveryCode && !order.deliveryCodeVerifiedAt ? order.deliveryCode : null,
  };
}
