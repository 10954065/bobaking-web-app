# Delivery map & routing providers

Two swappable pieces power the live delivery map, kept behind small interfaces so either can be replaced without touching application code:

## Map provider

`components/maps/DeliveryMap.tsx` renders via **MapLibre GL JS** against a style URL read from `MAP_STYLE_URL` (`providers/map-config.ts`), configured via `NEXT_PUBLIC_MAP_STYLE_URL`.

- **Default**: [OpenFreeMap](https://openfreemap.org)'s `liberty` style — free, no API key, OSM-based vector tiles.
- **To swap**: change `NEXT_PUBLIC_MAP_STYLE_URL` to any MapLibre-compatible style URL (a different hosted provider, or a self-hosted [OpenFreeMap](https://github.com/hyperknot/openfreemap) / [tileserver-gl](https://github.com/maptiler/tileserver-gl) instance). No code changes needed.
- If the new host serves tiles from a **different origin** than the style URL itself, also update the CSP in `src/proxy.ts` (`mapTileOrigin()` derives `connect-src` from the style URL's origin automatically for the common single-origin case — most providers, including OpenFreeMap, serve everything from one host).

### The Turbopack worker gotcha

MapLibre GL JS loads a background Web Worker for tile parsing. Its default worker-URL auto-detection (built for Webpack/Vite) silently resolves to an empty string under Next.js + Turbopack — the map never fires `load` and nothing ever renders, **with no console error**. The fix (already applied in `DeliveryMap.tsx`): serve static copies of the worker + its shared chunk from `public/maplibre/` and call `maplibregl.setWorkerUrl(...)` before creating any map. Those files are synced from `node_modules/maplibre-gl/dist/` by `scripts/copy-maplibre-worker.mjs`, wired into `postinstall` — if you bump the `maplibre-gl` version, run `npm install` (or `node scripts/copy-maplibre-worker.mjs` directly) to keep them in sync.

## Routing provider

`services/routing.service.ts` is the only module application code should call for a route — it depends on the `RoutingProvider` interface (`providers/routing-provider.interface.ts`), not on any concrete implementation.

- **Default implementation**: `OsrmRoutingProvider` (`providers/osrm-routing.provider.ts`), talking to any OSRM-compatible HTTP API at `ROUTING_API_URL`.
- **Default value**: the public OSRM demo server (`router.project-osrm.org`) — free, but explicitly asks not to be used for production/commercial traffic (rate-limited, no SLA).
- **To swap**: for a different OSRM-compatible host, just change `ROUTING_API_URL`. For a genuinely different routing engine (Valhalla, GraphHopper, a commercial API), write a new class implementing `RoutingProvider` and swap the `new OsrmRoutingProvider()` line in `routing.service.ts` — every caller (rider navigation, customer tracking, admin monitoring) is unaffected.
- `routing.service.ts` also owns the fallback behavior (a straight-line estimate, clearly flagged via `isEstimate`, when the provider is unreachable) and a short-lived in-memory cache — neither needs to be duplicated in a new provider implementation.

## Production checklist

Before relying on this in production:

1. Self-host or contract a paid tile provider — the OpenFreeMap public instance and the OSRM demo server are both explicitly not for production/commercial traffic at any real scale.
2. Update `NEXT_PUBLIC_MAP_STYLE_URL` / `ROUTING_API_URL` accordingly.
3. If self-hosting OSRM, consider adding a motorcycle/bicycle routing profile (the public demo only offers `driving`) — see `OsrmRoutingProvider.getRoute`'s hardcoded `/driving/` path if you add profile selection.
