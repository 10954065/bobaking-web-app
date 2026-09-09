import { prisma } from "@/db/client";
import { Prisma, type OrderStatus, type ReviewStatus } from "@prisma/client";
import { createReviewSchema, type CreateReviewInput } from "@/modules/reviews/schemas/review.schema";

export class ReviewError extends Error {}

export class OrderNotFoundError extends ReviewError {
  constructor() {
    super("We couldn't find that order.");
    this.name = "OrderNotFoundError";
  }
}

export class OrderNotEligibleForReviewError extends ReviewError {
  constructor() {
    super("This order isn't finished yet, so it can't be reviewed.");
    this.name = "OrderNotEligibleForReviewError";
  }
}

export class ReviewAlreadyExistsError extends ReviewError {
  constructor() {
    super("This order has already been reviewed.");
    this.name = "ReviewAlreadyExistsError";
  }
}

const REVIEWABLE_STATUSES: OrderStatus[] = ["DELIVERED", "COMPLETED"];

/** Public entry point from the order-tracking page — same trackingToken-as-capability
 * posture as support tickets (see support-ticket.service.ts). One review per order,
 * enforced at the DB via Review.orderId's unique constraint. */
export async function createReview(input: CreateReviewInput) {
  const data = createReviewSchema.parse(input);
  const order = await prisma.order.findUnique({ where: { trackingToken: data.trackingToken } });
  if (!order) throw new OrderNotFoundError();
  if (!REVIEWABLE_STATUSES.includes(order.status)) throw new OrderNotEligibleForReviewError();

  try {
    return await prisma.review.create({
      data: {
        orderId: order.id,
        customerId: order.customerId,
        branchId: order.branchId,
        rating: data.rating,
        comment: data.comment,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ReviewAlreadyExistsError();
    }
    throw error;
  }
}

export async function getReviewForOrder(trackingToken: string) {
  const order = await prisma.order.findUnique({ where: { trackingToken }, select: { id: true, status: true } });
  if (!order) return null;
  const review = await prisma.review.findUnique({ where: { orderId: order.id } });
  return { orderStatus: order.status, review };
}

export async function listReviews(branchIds: "ALL" | string[], params: { status?: ReviewStatus } = {}) {
  return prisma.review.findMany({
    where: {
      branchId: branchIds === "ALL" ? undefined : { in: branchIds },
      status: params.status,
    },
    include: { customer: true, branch: true, order: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function moderateReview(reviewId: string, status: ReviewStatus, actorUserId: string) {
  return prisma.review.update({
    where: { id: reviewId },
    data: { status, moderatedByUserId: actorUserId, moderatedAt: new Date() },
  });
}
