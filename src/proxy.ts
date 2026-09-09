import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { env } from "@/lib/env";

// Everything a public visitor must never be able to discover by guessing a
// URL — no redirect, no hint any of it exists. The only way in is the one
// shared STAFF_ACCESS_KEY gate below; once a real session exists, every one
// of these behaves exactly as it always did (the session — and RBAC on top
// of it — is what actually authorizes access, never the URL shape).
const HIDDEN_PREFIXES = ["/admin", "/pos", "/kitchen", "/rider", "/super-admin", "/account", "/login"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

// MapLibre GL fetches vector tiles/style/glyphs via fetch()/XHR from the
// browser, so its origin must be explicitly allow-listed in connect-src —
// derived from the same NEXT_PUBLIC_MAP_STYLE_URL that configures the map
// itself (see providers/map-config.ts) so swapping to a self-hosted tile
// server via env var doesn't also require a code change here. The routing
// provider (OSRM) needs no entry: those requests happen server-side (see
// routing.service.ts), never directly from the browser.
function mapTileOrigin(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty").origin;
  } catch {
    return null;
  }
}

// Turbopack's dev HMR client and React Fast Refresh need 'unsafe-eval' —
// relaxed only outside production so the dev experience isn't broken.
// script-src otherwise only trusts this exact request's nonce, which Next.js
// automatically applies to its own inline hydration/bootstrap scripts once
// it sees the nonce in this header (see the x-nonce request header below).
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = isDev ? `'self' 'nonce-${nonce}' 'unsafe-eval'` : `'self' 'nonce-${nonce}'`;
  const tileOrigin = mapTileOrigin();
  const connectSrc = ["'self'", tileOrigin].filter(Boolean).join(" ");
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // style-src needs 'unsafe-inline': a few components (analytics charts,
    // progress bars) set React inline `style` props for dynamic values like
    // bar heights, rendering as inline style="" attributes — same accepted
    // trade-off the web/security.md rules document for CSS-in-JS.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: https: ${tileOrigin ?? ""}`.trim(),
    `font-src 'self' data: ${tileOrigin ?? ""}`.trim(),
    `connect-src ${connectSrc}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; ");
}

export default auth((request) => {
  const { pathname } = request.nextUrl;

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // The one shared entry point staff use to reach the sign-in page —
  // /<STAFF_ACCESS_KEY> transparently rewrites to the real /login route
  // while keeping the address bar on the secret URL, so the literal /login
  // path is never revealed to anyone who doesn't already have this link.
  const gatePath = `/${env.STAFF_ACCESS_KEY}`;
  if (pathname === gatePath || pathname === `${gatePath}/`) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  if (matchesPrefix(pathname, HIDDEN_PREFIXES)) {
    const session = request.auth;
    const isAuthenticated = !!session?.user && session.error !== "SessionRevoked";

    if (!isAuthenticated) {
      // Rewritten (not redirected) to a guaranteed-unmatched path so Next
      // renders the real not-found.tsx with a genuine 404 — indistinguishable
      // from any other missing URL. A redirect here — even to the secret
      // gate — would hand a random visitor who blindly guessed "/admin"
      // proof that a backend exists behind it.
      const url = request.nextUrl.clone();
      url.pathname = `/__not-found__${pathname}`;
      const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
      response.headers.set("Content-Security-Policy", csp);
      return response;
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
