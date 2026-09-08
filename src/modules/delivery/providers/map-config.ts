/**
 * Client-safe map configuration. This file must never import anything
 * server-only (env.ts's proxy validates DATABASE_URL/AUTH_SECRET and will
 * throw if evaluated in a browser bundle) — it reads only NEXT_PUBLIC_*
 * values, which Next.js inlines as literal strings at build time.
 *
 * Defaults to OpenFreeMap's "liberty" style — a free, no-API-key OSM vector
 * basemap (openfreemap.org) that's also self-hostable via their open-source
 * tileserver. Override NEXT_PUBLIC_MAP_STYLE_URL for a different provider or
 * a self-hosted instance in production. See providers/README.md. Also
 * update src/proxy.ts's CSP if the new host serves tiles from more than one
 * origin (it derives connect-src from this same URL's origin).
 */
export const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty";
