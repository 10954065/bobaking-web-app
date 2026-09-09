import { env } from "@/lib/env";

const PRODUCTION_URL = "https://flicks-licks-delta.vercel.app";

/**
 * The site's own absolute origin — needed anywhere metadata is resolved
 * without an incoming request to derive it from (metadataBase, sitemap.xml,
 * robots.txt). Prefers APP_URL (set explicitly for non-Vercel hosts — see
 * its doc comment in env.ts), then Vercel's own stable production-domain
 * var (NOT VERCEL_URL, which is the ephemeral per-deployment URL and
 * changes on every deploy), and finally the known aliased production
 * domain so this resolves to something real even before either is set.
 */
export function getSiteUrl(): string {
  if (env.APP_URL) return env.APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return PRODUCTION_URL;
}
