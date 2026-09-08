import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PROTECTED_PREFIXES = ["/admin", "/pos", "/kitchen", "/rider", "/super-admin", "/account"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

// Turbopack's dev HMR client and React Fast Refresh need 'unsafe-eval' —
// relaxed only outside production so the dev experience isn't broken.
// script-src otherwise only trusts this exact request's nonce, which Next.js
// automatically applies to its own inline hydration/bootstrap scripts once
// it sees the nonce in this header (see the x-nonce request header below).
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = isDev ? `'self' 'nonce-${nonce}' 'unsafe-eval'` : `'self' 'nonce-${nonce}'`;
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // style-src needs 'unsafe-inline': a few components (analytics charts,
    // progress bars) set React inline `style` props for dynamic values like
    // bar heights, rendering as inline style="" attributes — same accepted
    // trade-off the web/security.md rules document for CSS-in-JS.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; ");
}

export default auth((request) => {
  const { pathname, search } = request.nextUrl;

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  if (isProtectedPath(pathname)) {
    const session = request.auth;
    const isAuthenticated = !!session?.user && session.error !== "SessionRevoked";

    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
      const response = NextResponse.redirect(loginUrl);
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
