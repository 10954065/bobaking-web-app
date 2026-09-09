import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * Caps how many connections THIS Prisma Client instance can hold open
 * against Neon's pooled connection. Left unset, Prisma's own default
 * (num_cpus * 2 + 1) is sized for one long-lived server process — wrong for
 * serverless, where many function instances can each open that many
 * connections at once and exhaust Neon's pooler budget. Observed live: a
 * "Timed out fetching a new connection from the connection pool" error that
 * broke an active staff login session, distinct from (and not fixed by) the
 * DEFAULT_TRANSACTION_OPTIONS widening below, which only paces individual
 * transactions, not how many connections a single instance can hold.
 * connection_limit/pool_timeout only affect Prisma's own client-side pool
 * and are safe to set unconditionally — they don't require any change on
 * the Neon/DATABASE_URL side.
 */
function withPoolParams(url: string): string {
  const parsed = new URL(url);
  if (!parsed.searchParams.has("connection_limit")) {
    parsed.searchParams.set("connection_limit", "5");
  }
  if (!parsed.searchParams.has("pool_timeout")) {
    parsed.searchParams.set("pool_timeout", "10");
  }
  return parsed.toString();
}

/** Falls back to undefined (Prisma's own env("DATABASE_URL") lookup) when DATABASE_URL isn't set yet — e.g. `next build`'s page-data collection step, which runs before deploy-time secrets exist. */
function resolveDatasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    return withPoolParams(raw);
  } catch {
    return raw;
  }
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    datasources: { db: { url: resolveDatasourceUrl() } },
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
