import type { NextConfig } from "next";

// Content-Security-Policy is NOT set here — it needs a fresh nonce per
// request (see proxy.ts) so Next.js's own inline hydration scripts can be
// allowed without falling back to 'unsafe-inline'. A static header here
// can't vary per request, so CSP is applied in middleware instead.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // geolocation=(self) — the rider app (see /rider) shares live position.
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Standalone output traces only the files each route actually needs into
  // .next/standalone — the Dockerfile copies just that instead of the full
  // node_modules tree, which is most of why the production image stays small.
  output: "standalone",
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
