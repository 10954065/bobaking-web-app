import Redis from "ioredis";
import { env } from "@/lib/env";

declare global {
  var __redisPublisher: Redis | undefined;
}

/** Shared connection for publishing — safe to reuse across requests. */
export function getRedisPublisher(): Redis {
  if (!global.__redisPublisher) {
    global.__redisPublisher = new Redis(env.REDIS_URL);
  }
  return global.__redisPublisher;
}

/** Pub/sub subscribers need their own connection — once in subscribe mode, ioredis can't issue other commands on it. */
export function createRedisSubscriber(): Redis {
  return new Redis(env.REDIS_URL);
}
