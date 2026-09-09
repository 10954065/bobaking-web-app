"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupportTicketForOrder, addCustomerMessage, SupportTicketError } from "@/modules/support/services/support-ticket.service";
import { createReview, ReviewError } from "@/modules/reviews/services/review.service";
import { enforceRateLimit, getRequestIp, RateLimitError } from "@/lib/rate-limit";

// The URL is keyed by the secure trackingToken (not orderNumber — see
// Order.trackingToken's doc comment), so every redirect/revalidate target
// here must use the token the page was actually loaded with. The
// support-ticket/review services below look the order up by that same
// token, never by orderNumber, which is sequential and guessable.
function errorRedirect(token: string, message: string): never {
  redirect(`/track/${token}?error=${encodeURIComponent(message)}`);
}

// Generous enough for a real customer submitting/replying a few times, tight
// enough to stop a bot from hammering these public, unauthenticated writes.
const PUBLIC_WRITE_RATE_LIMIT = { limit: 20, windowSeconds: 60 * 60 };

async function enforcePublicWriteLimit(action: string, token: string) {
  const ip = await getRequestIp();
  try {
    await enforceRateLimit(`track:${action}:${ip}`, PUBLIC_WRITE_RATE_LIMIT);
  } catch (error) {
    if (error instanceof RateLimitError) errorRedirect(token, error.message);
    throw error;
  }
}

export async function createSupportTicketFormAction(token: string, formData: FormData) {
  await enforcePublicWriteLimit("support-ticket", token);

  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!subject || !message) {
    errorRedirect(token, "Please fill in both a subject and a message.");
  }

  try {
    await createSupportTicketForOrder({ trackingToken: token, subject, message });
  } catch (error) {
    if (error instanceof SupportTicketError) errorRedirect(token, error.message);
    throw error;
  }
  revalidatePath(`/track/${token}`);
}

export async function addTicketMessageFormAction(token: string, ticketId: string, formData: FormData) {
  await enforcePublicWriteLimit("ticket-message", token);

  const body = String(formData.get("body") ?? "").trim();
  if (!body) errorRedirect(token, "Message can't be empty.");

  try {
    await addCustomerMessage(ticketId, { body });
  } catch (error) {
    if (error instanceof SupportTicketError) errorRedirect(token, error.message);
    throw error;
  }
  revalidatePath(`/track/${token}`);
}

export async function submitReviewFormAction(token: string, formData: FormData) {
  await enforcePublicWriteLimit("review", token);

  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();

  try {
    await createReview({ trackingToken: token, rating, comment: comment || undefined });
  } catch (error) {
    if (error instanceof ReviewError) errorRedirect(token, error.message);
    throw error;
  }
  revalidatePath(`/track/${token}`);
}
