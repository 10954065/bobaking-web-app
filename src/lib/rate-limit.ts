import { headers } from "next/headers";
import { getRedisPublisher } from "@/lib/redis";

export class RateLimitError extends Error {
  constructor(message = "Too many requests. Please try again in a few minutes.") {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Best-effort client IP from the standard proxy headers. Trustworthy only
 * behind a proxy that sets/overwrites these itself (Vercel, most CDNs) —
 * fine for rate limiting (worst case under spoofing is a shared bucket,
 * not an auth bypass), never use this for anything security-critical.
 */
export async function getRequestIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headerList.get("x-real-ip") ?? "unknown";
}

/**
 * Fixed-window counter backed by Redis — INCR is atomic, so concurrent
 * requests can't race past the limit. `key` should already identify both
 * the action and the requester (e.g. "login:<ip>", "support-ticket:<ip>").
 * Throws RateLimitError once the window's limit is exceeded.
 */
export async function enforceRateLimit(key: string, params: { limit: number; windowSeconds: number }): Promise<void> {
  const redis = getRedisPublisher();
  const redisKey = `ratelimit:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, params.windowSeconds);
  }
  if (count > params.limit) {
    throw new RateLimitError();
  }
}
