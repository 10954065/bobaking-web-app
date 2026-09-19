import { NextResponse } from "next/server";
import { UserFacingError, toSafeErrorMessage } from "@/lib/errors";
import { RateLimitError } from "@/lib/rate-limit";

/**
 * JSON-response counterpart to withSafeErrors() (src/lib/errors.ts), for the
 * src/app/api/mobile/** route handlers the Flutter app calls directly over
 * plain HTTP instead of Next's Server Actions RPC — same "never leak a raw
 * internal error" rule, translated to a real HTTP status code per error kind
 * instead of a thrown Error string.
 */
export function mobileErrorResponse(error: unknown, fallback?: string): NextResponse {
  console.error(error);
  const status = error instanceof RateLimitError ? 429 : error instanceof UserFacingError ? 400 : 500;
  return NextResponse.json({ error: toSafeErrorMessage(error, fallback) }, { status });
}

/** Extracts the session token from `Authorization: Bearer <token>` — the mobile app's stand-in for the browser's httpOnly session cookie. */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}
