import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Only the two pages worth a search engine indexing — everything else is
 * either staff-only (hidden entirely, 404s for the public — see proxy.ts)
 * or per-order/per-customer (tracking links, /my-account): real, reachable
 * pages, just never worth surfacing in search results.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();
  return [
    { url: base, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/order`, lastModified, changeFrequency: "weekly", priority: 0.9 },
  ];
}
