"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/db/client";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requirePermission } from "@/modules/auth/services/authorization.service";
import { moderateReview } from "@/modules/reviews/services/review.service";
import type { ReviewStatus } from "@prisma/client";
import { withSafeErrors } from "@/lib/errors";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export const moderateReviewAction = withSafeErrors(async (reviewId: string, status: ReviewStatus): Promise<void> => {
  const userId = await requireUserId();
  const review = await prisma.review.findUniqueOrThrow({ where: { id: reviewId } });
  await requirePermission(userId, "reviews", "moderate", review.branchId);
  await moderateReview(reviewId, status, userId);
  revalidatePath("/admin/reviews");
}, "Couldn't moderate that review right now — please try again.");
