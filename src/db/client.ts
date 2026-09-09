import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

/**
 * Pass as the second argument to every interactive prisma.$transaction(fn)
 * call (not the array form — that doesn't pace queries against JS code
 * running in between, so it isn't exposed to this). Prisma's own defaults
 * (5000ms transaction timeout, 2000ms connection wait) assume low-latency
 * access to the database; this project's pooled connection has repeatedly
 * hit "Transaction already closed"/"Transaction not found" under real
 * network latency well inside a normal request. Widening the budget doesn't
 * fix slow network, but it stops a transaction that would have succeeded in
 * 6-8s from being killed at 5s for no reason.
 */
export const DEFAULT_TRANSACTION_OPTIONS = { maxWait: 8000, timeout: 15000 };
