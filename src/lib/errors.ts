/**
 * An error whose message is safe to show a customer or staff member
 * verbatim — deliberately written to be short, actionable, and free of any
 * internal detail (query text, stack traces, provider payloads). Everything
 * else — Prisma errors, network failures, any exception nobody specifically
 * wrote customer-facing copy for — must never reach the client as-is; see
 * toSafeErrorMessage() and withSafeErrors() below.
 *
 * Domain error classes that are already written to be shown to a user
 * (EmptyCartError, ProductUnavailableError, MissingDeliveryAddressError,
 * InvalidDeliveryAddressError in checkout.service.ts; InvalidOrderTransitionError
 * in order-state-machine.ts; RateLimitError in rate-limit.ts; the balance
 * checks in payment.service.ts's refundPayment) extend this instead of Error.
 */
export class UserFacingError extends Error {}

const GENERIC_FALLBACK = "Something went wrong on our end. Please try again in a moment.";

export function toSafeErrorMessage(error: unknown, fallback: string = GENERIC_FALLBACK): string {
  if (error instanceof UserFacingError) return error.message;
  return fallback;
}

/**
 * Wraps a server action (or any async function called directly from client
 * code): logs the real error server-side, then re-throws a message that's
 * either the original (if it was deliberately written to be user-facing) or
 * a generic fallback — never the raw internal error. Use on every server
 * action a customer or staff member's client code calls directly.
 */
export function withSafeErrors<Args extends unknown[], T>(
  fn: (...args: Args) => Promise<T>,
  fallback?: string
): (...args: Args) => Promise<T> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(error);
      throw new Error(toSafeErrorMessage(error, fallback));
    }
  };
}
