import type { OrderStatus } from "@prisma/client";

/**
 * Valid transitions out of each status. Not every order type uses every
 * status (e.g. PICKUP never sees ASSIGNED_TO_RIDER) — rather than branch the
 * whole graph per type, DRAFT/READY/etc. simply allow multiple next states
 * and callers pick the one that applies to their order type. Terminal states
 * (COMPLETED, REJECTED) have no outgoing edges; REFUNDED does allow one more
 * step in the future (e.g. partial→full) but nothing today.
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["PENDING_PAYMENT", "CONFIRMED", "CANCELLED"],
  PENDING_PAYMENT: ["CONFIRMED", "PAYMENT_FAILED", "CANCELLED"],
  PAYMENT_FAILED: ["PENDING_PAYMENT", "CANCELLED"],
  CONFIRMED: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["SENT_TO_KITCHEN", "CANCELLED"],
  SENT_TO_KITCHEN: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["ASSIGNED_TO_RIDER", "COMPLETED", "CANCELLED"],
  ASSIGNED_TO_RIDER: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: ["REFUNDED"],
  REFUNDED: [],
  REJECTED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextValidStatuses(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export class InvalidOrderTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Cannot transition order from ${from} to ${to}`);
    this.name = "InvalidOrderTransitionError";
  }
}
