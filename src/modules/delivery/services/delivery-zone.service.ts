import { prisma } from "@/db/client";
import {
  createDeliveryZoneSchema,
  updateDeliveryZoneSchema,
  type CreateDeliveryZoneInput,
  type UpdateDeliveryZoneInput,
} from "@/modules/delivery/schemas/delivery-zone.schema";

export async function listZonesForBranch(branchId: string, params: { includeInactive?: boolean } = {}) {
  return prisma.deliveryZone.findMany({
    where: { branchId, ...(params.includeInactive ? {} : { isActive: true }) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createDeliveryZone(input: CreateDeliveryZoneInput) {
  const data = createDeliveryZoneSchema.parse(input);
  return prisma.deliveryZone.create({ data });
}

export async function updateDeliveryZone(id: string, input: UpdateDeliveryZoneInput) {
  const data = updateDeliveryZoneSchema.parse(input);
  return prisma.deliveryZone.update({ where: { id }, data });
}

/** Zones are never hard-deleted — historical orders reference them via Order.deliveryZoneId. Hiding one only flips isActive. */
export async function deactivateDeliveryZone(id: string) {
  return prisma.deliveryZone.update({ where: { id }, data: { isActive: false } });
}
