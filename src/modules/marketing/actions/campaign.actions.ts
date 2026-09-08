"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requireAnyPermission } from "@/modules/auth/services/authorization.service";
import { createCampaign, updateCampaignStatus } from "@/modules/marketing/services/campaign.service";
import type { CreateCampaignInput, UpdateCampaignStatusInput } from "@/modules/marketing/schemas/campaign.schema";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

interface CampaignSummary {
  id: string;
  name: string;
  status: string;
}

export async function createCampaignAction(input: CreateCampaignInput): Promise<CampaignSummary> {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "marketing", "create");
  const campaign = await createCampaign(input);
  revalidatePath("/admin/marketing/campaigns");
  return { id: campaign.id, name: campaign.name, status: campaign.status };
}

export async function updateCampaignStatusAction(id: string, input: UpdateCampaignStatusInput): Promise<CampaignSummary> {
  const userId = await requireUserId();
  await requireAnyPermission(userId, "marketing", "update");
  const campaign = await updateCampaignStatus(id, input);
  revalidatePath("/admin/marketing/campaigns");
  return { id: campaign.id, name: campaign.name, status: campaign.status };
}
