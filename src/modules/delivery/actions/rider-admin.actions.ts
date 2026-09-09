"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requirePermission } from "@/modules/auth/services/authorization.service";
import { createRider } from "@/modules/delivery/services/rider.service";
import type { CreateRiderInput } from "@/modules/delivery/schemas/rider.schema";
import { withSafeErrors } from "@/lib/errors";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

/** Rider accounts are branch-owned via the RIDER role grant created alongside them. */
export const createRiderAction = withSafeErrors(async (input: CreateRiderInput): Promise<{ id: string; firstName: string; lastName: string }> => {
  const userId = await requireUserId();
  await requirePermission(userId, "riders", "create", input.branchId);
  const rider = await createRider(input);
  revalidatePath("/admin/delivery/riders");
  return { id: rider.id, firstName: rider.firstName, lastName: rider.lastName };
}, "Couldn't create that rider right now. Please try again.");
