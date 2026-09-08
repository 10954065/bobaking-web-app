import { z } from "zod";

export const createSupportTicketSchema = z.object({
  orderNumber: z.string().min(1),
  subject: z.string().min(3).max(200),
  message: z.string().min(1).max(4000),
});
export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;

export const ticketMessageSchema = z.object({
  body: z.string().min(1).max(4000),
});
export type TicketMessageInput = z.infer<typeof ticketMessageSchema>;
