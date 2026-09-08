import { prisma } from "@/db/client";

export interface PublicOrderTracking {
  orderNumber: string;
  status: string;
  type: string;
  branchName: string;
  createdAt: string;
  items: { productName: string; quantity: number }[];
  total: number;
  statusHistory: { toStatus: string; createdAt: string }[];
  rider: { firstName: string; lastLocationAt: string | null } | null;
  /** Read this out to your rider on arrival — only set for DELIVERY orders, and hidden once the handoff is already confirmed. */
  deliveryCode: string | null;
}

/**
 * Reachable by anyone who knows the order number — no login required, so
 * this must never expose customer PII (name/phone/address), payment
 * details, or exact rider coordinates. Only order-status information a
 * customer would see on a receipt or a "track my order" link.
 */
export async function getPublicOrderTracking(orderNumber: string): Promise<PublicOrderTracking | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      branch: true,
      items: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
      assignedRider: { include: { riderProfile: true } },
    },
  });
  if (!order) return null;

  // Only show the rider while the delivery is actually in transit — once
  // DELIVERED (or any other status), "so-and-so is on the way" would be
  // stale/wrong even though a rider is still attached to the order.
  const riderInTransit =
    order.assignedRider &&
    (order.status === "ASSIGNED_TO_RIDER" || order.status === "PICKED_UP" || order.status === "OUT_FOR_DELIVERY");

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    type: order.type,
    branchName: order.branch.name,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({ productName: item.productName, quantity: item.quantity })),
    total: Number(order.total),
    statusHistory: order.statusHistory.map((h) => ({ toStatus: h.toStatus, createdAt: h.createdAt.toISOString() })),
    rider: riderInTransit
      ? {
          firstName: order.assignedRider!.firstName,
          lastLocationAt: order.assignedRider!.riderProfile?.lastLocationAt?.toISOString() ?? null,
        }
      : null,
    // Once the rider has already punched it in there's nothing left to prove — showing a stale code after DELIVERED would just be confusing.
    deliveryCode: order.deliveryCode && !order.deliveryCodeVerifiedAt ? order.deliveryCode : null,
  };
}
