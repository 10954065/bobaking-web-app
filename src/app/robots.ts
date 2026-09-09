import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { HIDDEN_PREFIXES } from "@/lib/hidden-prefixes";

/**
 * Defense-in-depth alongside proxy.ts's hidden-prefix 404s — well-behaved
 * crawlers skip these paths outright instead of relying only on the 404 to
 * keep them out of search results. /track and /my-account are real, public,
 * reachable pages (not staff-gated) but are per-order/per-customer, so
 * there's nothing there worth indexing either.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...HIDDEN_PREFIXES, "/my-account", "/track", "/api"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
