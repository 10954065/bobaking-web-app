import { prisma } from "@/db/client";
import { getRedisPublisher } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * Unauthenticated by design — deployment platforms and uptime monitors need
 * to reach this without credentials. Reveals only up/down status per
 * dependency, never connection strings, versions, or error details.
 */
export async function GET() {
  const [dbOk, redisOk] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    getRedisPublisher()
      .ping()
      .then(() => true)
      .catch(() => false),
  ]);

  const healthy = dbOk && redisOk;
  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      checks: { database: dbOk ? "ok" : "down", redis: redisOk ? "ok" : "down" },
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
