// MapLibre GL JS's default worker-URL resolution (meant to work automatically
// under Webpack/Vite) resolves to an empty string under Turbopack, silently
// breaking all tile loading (the Worker gets constructed with no script and
// nothing ever renders — no console error). The documented fix for bundlers
// MapLibre doesn't auto-detect is to serve its worker + shared chunk as
// static files and point maplibregl.setWorkerUrl() at them directly (see
// DeliveryMap.tsx). This script keeps those static copies in sync with
// whatever maplibre-gl version is actually installed — run automatically via
// the "postinstall" script so an `npm install`/version bump never leaves a
// stale copy in public/maplibre/.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "..", "node_modules", "maplibre-gl", "dist");
const targetDir = join(__dirname, "..", "public", "maplibre");

const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

mkdirSync(targetDir, { recursive: true });

for (const file of FILES) {
  const source = join(distDir, file);
  if (!existsSync(source)) {
    console.warn(`[copy-maplibre-worker] ${file} not found in maplibre-gl/dist — skipping. Map tiles may not load; see DeliveryMap.tsx.`);
    continue;
  }
  copyFileSync(source, join(targetDir, file));
}

console.log("[copy-maplibre-worker] Synced maplibre-gl worker files to public/maplibre/");
