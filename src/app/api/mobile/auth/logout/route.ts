import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { bearerToken, mobileErrorResponse } from "@/lib/mobile-api";
import { revokeCustomerSession } from "@/modules/customer-auth/services/customer-session.service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const token = bearerToken(request);
    if (token) await revokeCustomerSession(token);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return mobileErrorResponse(error, "Couldn't sign out right now.");
  }
}
