import { prisma, DEFAULT_TRANSACTION_OPTIONS } from "@/db/client";
import type { SupportTicketStatus } from "@prisma/client";
import { UserFacingError } from "@/lib/errors";
import {
  createSupportTicketSchema,
  ticketMessageSchema,
  type CreateSupportTicketInput,
  type TicketMessageInput,
} from "@/modules/support/schemas/support.schema";

export class SupportTicketError extends UserFacingError {}

export class OrderNotFoundError extends SupportTicketError {
  constructor() {
    super("We couldn't find an order with that number.");
    this.name = "OrderNotFoundError";
  }
}

const OPEN_STATUSES: SupportTicketStatus[] = ["RESOLVED", "CLOSED"];

/**
 * Public entry point from the order-tracking page (see order-tracking.service.ts's
 * own PII rule — there's no customer login, so the order number IS the
 * capability). customerId/branchId are always derived from the order itself,
 * never trusted from client input.
 */
export async function createSupportTicketForOrder(input: CreateSupportTicketInput) {
  const data = createSupportTicketSchema.parse(input);
  const order = await prisma.order.findUnique({ where: { orderNumber: data.orderNumber } });
  if (!order) throw new OrderNotFoundError();

  return prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.create({
      data: { customerId: order.customerId, orderId: order.id, branchId: order.branchId, subject: data.subject },
    });
    await tx.supportMessage.create({
      data: { ticketId: ticket.id, authorType: "CUSTOMER", body: data.message },
    });
    return ticket;
  }, DEFAULT_TRANSACTION_OPTIONS);
}

/** The tracking page's own view of a ticket — no staff names, just the thread. */
export async function getTicketForOrder(orderNumber: string) {
  const order = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true } });
  if (!order) return null;
  return prisma.supportTicket.findFirst({
    where: { orderId: order.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

/** A customer reply reopens a resolved/closed ticket — resolved-for-staff doesn't mean resolved-for-them if they're still writing in. */
export async function addCustomerMessage(ticketId: string, input: TicketMessageInput) {
  const data = ticketMessageSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.findUniqueOrThrow({ where: { id: ticketId } });
    await tx.supportMessage.create({ data: { ticketId, authorType: "CUSTOMER", body: data.body } });
    if (OPEN_STATUSES.includes(ticket.status)) {
      await tx.supportTicket.update({ where: { id: ticketId }, data: { status: "OPEN" } });
    }
  }, DEFAULT_TRANSACTION_OPTIONS);
}

export async function listTicketsForBranches(branchIds: "ALL" | string[], params: { status?: SupportTicketStatus } = {}) {
  return prisma.supportTicket.findMany({
    where: {
      branchId: branchIds === "ALL" ? undefined : { in: branchIds },
      status: params.status,
    },
    include: { customer: true, order: true, branch: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getTicketById(id: string) {
  return prisma.supportTicket.findUnique({
    where: { id },
    include: {
      customer: true,
      order: true,
      branch: true,
      assignedTo: true,
      messages: { orderBy: { createdAt: "asc" }, include: { authorUser: true } },
    },
  });
}

/** A staff reply on an OPEN ticket implicitly claims it — moves it to IN_PROGRESS so it stops showing as unattended. */
export async function addStaffMessage(ticketId: string, params: { authorUserId: string; body: string }) {
  const data = ticketMessageSchema.parse({ body: params.body });
  return prisma.$transaction(async (tx) => {
    await tx.supportMessage.create({
      data: { ticketId, authorType: "STAFF", authorUserId: params.authorUserId, body: data.body },
    });
    const ticket = await tx.supportTicket.findUniqueOrThrow({ where: { id: ticketId } });
    if (ticket.status === "OPEN") {
      await tx.supportTicket.update({ where: { id: ticketId }, data: { status: "IN_PROGRESS" } });
    }
  }, DEFAULT_TRANSACTION_OPTIONS);
}

export async function updateTicketStatus(ticketId: string, status: SupportTicketStatus) {
  return prisma.supportTicket.update({ where: { id: ticketId }, data: { status } });
}
