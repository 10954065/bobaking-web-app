const PRODUCTION_URL = "https://flicks-licks-delta.vercel.app";

/**
 * The site's own absolute origin — needed anywhere metadata is resolved
 * without an incoming request to derive it from (metadataBase, sitemap.xml,
 * robots.txt). Prefers APP_URL (set explicitly for non-Vercel hosts — see
 * its doc comment in env.ts), then Vercel's own stable production-domain
 * var (NOT VERCEL_URL, which is the ephemeral per-deployment URL and
 * changes on every deploy), and finally the known aliased production
 * domain so this resolves to something real even before either is set.
 *
 * Reads process.env directly rather than the validated env singleton
 * (src/lib/env.ts) on purpose: that singleton validates every field the
 * first time ANY of its properties is touched, and layout.tsx's static
 * `metadata` export evaluates this at module scope — i.e. during next
 * build's page-data collection (see env.ts's own doc comment on exactly
 * this hazard), not deferred to request time like every other env read in
 * this codebase. An unrelated env var failing validation would fail the
 * build over something this function doesn't even use.
 */
export function getSiteUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return PRODUCTION_URL;
}
