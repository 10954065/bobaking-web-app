"use server";

import { createCampaignAction, updateCampaignStatusAction } from "@/modules/marketing/actions/campaign.actions";

const AUDIENCES = ["ALL_CUSTOMERS", "NEW_CUSTOMERS", "RETURNING_CUSTOMERS"] as const;

export async function createCampaignFormAction(formData: FormData) {
  const audienceRaw = String(formData.get("audience") ?? "ALL_CUSTOMERS");
  const audience = (AUDIENCES as readonly string[]).includes(audienceRaw)
    ? (audienceRaw as (typeof AUDIENCES)[number])
    : "ALL_CUSTOMERS";
  const promotionId = String(formData.get("promotionId") ?? "");

  await createCampaignAction({
    name: String(formData.get("name") ?? ""),
    audience,
    promotionId: promotionId || undefined,
  });
}

export async function setCampaignStatusFormAction(id: string, status: "DRAFT" | "ACTIVE" | "ENDED") {
  await updateCampaignStatusAction(id, { status });
}
