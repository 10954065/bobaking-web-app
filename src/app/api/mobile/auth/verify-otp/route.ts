import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestIp, enforceRateLimit } from "@/lib/rate-limit";
import { mobileErrorResponse } from "@/lib/mobile-api";
import { verifyOtpSchema } from "@/modules/customer-auth/schemas/customer-auth.schema";
import { verifyOtp } from "@/modules/customer-auth/services/customer-otp.service";

export const dynamic = "force-dynamic";

/**
 * Mobile counterpart to verifyCustomerOtpAction (customer-auth.actions.ts).
 * The web app gets its session as an httpOnly cookie; a native client has no
 * cookie jar, so this hands the raw sessionToken back in the JSON body
 * instead — the app stores it and sends it back as `Authorization: Bearer
 * <token>` on every authenticated call (see getCustomerByBearerToken()).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { phone, code } = verifyOtpSchema.parse({ phone: body.phone, code: body.code });

    const ip = await getRequestIp();
    await enforceRateLimit(`otp-verify:ip:${ip}`, { limit: 30, windowSeconds: 900 });
    await enforceRateLimit(`otp-verify:phone:${phone}`, { limit: 10, windowSeconds: 900 });

    const { customer, sessionToken, expires } = await verifyOtp(phone, code);
    return NextResponse.json({ customer, sessionToken, expiresAt: expires.toISOString() });
  } catch (error) {
    return mobileErrorResponse(error, "That code didn't work. Please try again.");
  }
}
