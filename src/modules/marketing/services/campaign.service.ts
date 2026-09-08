import { prisma } from "@/db/client";
import type { CampaignAudience } from "@prisma/client";
import {
  createCampaignSchema,
  updateCampaignStatusSchema,
  type CreateCampaignInput,
  type UpdateCampaignStatusInput,
} from "@/modules/marketing/schemas/campaign.schema";

/**
 * There's no email/SMS send infrastructure yet (Phase 9), so a campaign
 * doesn't "send" anything — its audience size is a real, live count against
 * Customer/Order, not a fabricated number, so the figure shown in the admin
 * UI is always accurate to answer "how many people would this reach."
 */
export async function computeAudienceSize(audience: CampaignAudience): Promise<number> {
  if (audience === "NEW_CUSTOMERS") {
    return prisma.customer.count({ where: { deletedAt: null, orders: { none: {} } } });
  }
  if (audience === "RETURNING_CUSTOMERS") {
    return prisma.customer.count({ where: { deletedAt: null, orders: { some: {} } } });
  }
  return prisma.customer.count({ where: { deletedAt: null } });
}

export async function listCampaigns() {
  return prisma.campaign.findMany({
    include: { promotion: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCampaign(input: CreateCampaignInput) {
  const data = createCampaignSchema.parse(input);
  return prisma.campaign.create({ data });
}

export async function updateCampaignStatus(id: string, input: UpdateCampaignStatusInput) {
  const data = updateCampaignStatusSchema.parse(input);
  return prisma.campaign.update({ where: { id }, data });
}
