"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupportTicketForOrder, addCustomerMessage, SupportTicketError } from "@/modules/support/services/support-ticket.service";
import { createReview, ReviewError } from "@/modules/reviews/services/review.service";
import { enforceRateLimit, getRequestIp, RateLimitError } from "@/lib/rate-limit";

function errorRedirect(orderNumber: string, message: string): never {
  redirect(`/track/${orderNumber}?error=${encodeURIComponent(message)}`);
}

// Generous enough for a real customer submitting/replying a few times, tight
// enough to stop a bot from hammering these public, unauthenticated writes.
const PUBLIC_WRITE_RATE_LIMIT = { limit: 20, windowSeconds: 60 * 60 };

async function enforcePublicWriteLimit(action: string, orderNumber: string) {
  const ip = await getRequestIp();
  try {
    await enforceRateLimit(`track:${action}:${ip}`, PUBLIC_WRITE_RATE_LIMIT);
  } catch (error) {
    if (error instanceof RateLimitError) errorRedirect(orderNumber, error.message);
    throw error;
  }
}

export async function createSupportTicketFormAction(orderNumber: string, formData: FormData) {
  await enforcePublicWriteLimit("support-ticket", orderNumber);

  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!subject || !message) {
    errorRedirect(orderNumber, "Please fill in both a subject and a message.");
  }

  try {
    await createSupportTicketForOrder({ orderNumber, subject, message });
  } catch (error) {
    if (error instanceof SupportTicketError) errorRedirect(orderNumber, error.message);
    throw error;
  }
  revalidatePath(`/track/${orderNumber}`);
}

export async function addTicketMessageFormAction(orderNumber: string, ticketId: string, formData: FormData) {
  await enforcePublicWriteLimit("ticket-message", orderNumber);

  const body = String(formData.get("body") ?? "").trim();
  if (!body) errorRedirect(orderNumber, "Message can't be empty.");

  try {
    await addCustomerMessage(ticketId, { body });
  } catch (error) {
    if (error instanceof SupportTicketError) errorRedirect(orderNumber, error.message);
    throw error;
  }
  revalidatePath(`/track/${orderNumber}`);
}

export async function submitReviewFormAction(orderNumber: string, formData: FormData) {
  await enforcePublicWriteLimit("review", orderNumber);

  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();

  try {
    await createReview({ orderNumber, rating, comment: comment || undefined });
  } catch (error) {
    if (error instanceof ReviewError) errorRedirect(orderNumber, error.message);
    throw error;
  }
  revalidatePath(`/track/${orderNumber}`);
}
