import { prisma } from "@/db/client";
import { getDeliveryRoute, type DeliveryRoute } from "@/modules/delivery/services/routing.service";
import { getDeliveryLocation } from "@/modules/delivery/services/delivery-location.service";
import type { Coordinates } from "@/modules/delivery/services/fare.service";

export class NavigationUnavailableError extends Error {
  constructor(message = "Navigation isn't available for this delivery yet.") {
    super(message);
    this.name = "NavigationUnavailableError";
  }
}

export type DestinationLabel = "restaurant" | "customer";

export interface DeliveryNavigation {
  origin: Coordinates;
  destination: Coordinates;
  destinationLabel: DestinationLabel;
  route: DeliveryRoute;
}

/**
 * Resolves what a rider (or anyone watching the delivery) should currently
 * be routed to, entirely server-side — the client never supplies origin or
 * destination coordinates for routing, both are derived from the order's
 * own state. Destination flips from the branch to the customer's address
 * the moment the order leaves ASSIGNED_TO_RIDER (see delivery-order.service.ts's
 * riderMarkPickedUp, which auto-chains PICKED_UP -> OUT_FOR_DELIVERY).
 */
export async function getDeliveryNavigation(orderId: string): Promise<DeliveryNavigation> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { branch: true, deliveryAddress: true, assignedRider: { include: { riderProfile: true } } },
  });

  const branchCoords: Coordinates | null =
    order.branch.latitude != null && order.branch.longitude != null
      ? { latitude: Number(order.branch.latitude), longitude: Number(order.branch.longitude) }
      : null;
  const customerCoords: Coordinates | null =
    order.deliveryAddress?.latitude != null && order.deliveryAddress?.longitude != null
      ? { latitude: Number(order.deliveryAddress.latitude), longitude: Number(order.deliveryAddress.longitude) }
      : null;

  const destinationLabel: DestinationLabel = order.status === "ASSIGNED_TO_RIDER" ? "restaurant" : "customer";
  const destination = destinationLabel === "restaurant" ? branchCoords : customerCoords;
  if (!destination) {
    throw new NavigationUnavailableError(
      destinationLabel === "restaurant" ? "This branch has no coordinates configured." : "This delivery has no geocoded address."
    );
  }

  const currentLocation = await getDeliveryLocation(orderId);
  const riderProfile = order.assignedRider?.riderProfile;
  const origin: Coordinates | null =
    (currentLocation && { latitude: currentLocation.latitude, longitude: currentLocation.longitude }) ??
    (riderProfile?.currentLatitude != null && riderProfile?.currentLongitude != null
      ? { latitude: Number(riderProfile.currentLatitude), longitude: Number(riderProfile.currentLongitude) }
      : null) ??
    branchCoords;
  if (!origin) {
    throw new NavigationUnavailableError("The rider's location isn't available yet.");
  }

  const route = await getDeliveryRoute(origin, destination);
  return { origin, destination, destinationLabel, route };
}
