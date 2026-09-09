"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requirePermission } from "@/modules/auth/services/authorization.service";
import {
  createDeliveryZone,
  updateDeliveryZone,
  deactivateDeliveryZone,
} from "@/modules/delivery/services/delivery-zone.service";
import type { CreateDeliveryZoneInput, UpdateDeliveryZoneInput } from "@/modules/delivery/schemas/delivery-zone.schema";
import { withSafeErrors } from "@/lib/errors";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

interface ZoneSummary {
  id: string;
  name: string;
  areaMatch: string;
  fee: number;
  isActive: boolean;
}

function toZoneSummary(zone: { id: string; name: string; areaMatch: string; fee: unknown; isActive: boolean }): ZoneSummary {
  return { id: zone.id, name: zone.name, areaMatch: zone.areaMatch, fee: Number(zone.fee), isActive: zone.isActive };
}

/** DeliveryZone is branch-owned — always the strict, branch-matching check. */
export const createDeliveryZoneAction = withSafeErrors(async (input: CreateDeliveryZoneInput): Promise<ZoneSummary> => {
  const userId = await requireUserId();
  await requirePermission(userId, "delivery", "update", input.branchId);
  const zone = await createDeliveryZone(input);
  revalidatePath("/admin/delivery/zones");
  return toZoneSummary(zone);
}, "Couldn't create that zone right now — please try again.");

export const updateDeliveryZoneAction = withSafeErrors(async (id: string, branchId: string, input: UpdateDeliveryZoneInput): Promise<ZoneSummary> => {
  const userId = await requireUserId();
  await requirePermission(userId, "delivery", "update", branchId);
  const zone = await updateDeliveryZone(id, input);
  revalidatePath("/admin/delivery/zones");
  return toZoneSummary(zone);
}, "Couldn't update that zone right now — please try again.");

export const deactivateDeliveryZoneAction = withSafeErrors(async (id: string, branchId: string): Promise<ZoneSummary> => {
  const userId = await requireUserId();
  await requirePermission(userId, "delivery", "update", branchId);
  const zone = await deactivateDeliveryZone(id);
  revalidatePath("/admin/delivery/zones");
  return toZoneSummary(zone);
}, "Couldn't deactivate that zone right now — please try again.");
