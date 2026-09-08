"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requirePermission } from "@/modules/auth/services/authorization.service";
import { getTicketById, addStaffMessage, updateTicketStatus } from "@/modules/support/services/support-ticket.service";
import type { SupportTicketStatus } from "@prisma/client";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

async function requireTicketBranch(ticketId: string): Promise<{ userId: string; branchId: string | null }> {
  const userId = await requireUserId();
  const ticket = await getTicketById(ticketId);
  if (!ticket) throw new Error("Ticket not found");
  return { userId, branchId: ticket.branchId };
}

export async function replyToTicketAction(ticketId: string, body: string): Promise<void> {
  const { userId, branchId } = await requireTicketBranch(ticketId);
  await requirePermission(userId, "support", "update", branchId);
  await addStaffMessage(ticketId, { authorUserId: userId, body });
  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin/support");
}

export async function updateTicketStatusAction(ticketId: string, status: SupportTicketStatus): Promise<void> {
  const { userId, branchId } = await requireTicketBranch(ticketId);
  await requirePermission(userId, "support", "update", branchId);
  await updateTicketStatus(ticketId, status);
  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin/support");
}
