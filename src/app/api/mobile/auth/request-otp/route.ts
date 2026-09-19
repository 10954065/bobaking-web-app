import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestIp, enforceRateLimit } from "@/lib/rate-limit";
import { mobileErrorResponse } from "@/lib/mobile-api";
import { requestOtpSchema } from "@/modules/customer-auth/schemas/customer-auth.schema";
import { requestOtp } from "@/modules/customer-auth/services/customer-otp.service";

export const dynamic = "force-dynamic";

/** Same rate limits and flow as requestCustomerOtpAction (customer-auth.actions.ts), exposed over plain JSON for the mobile app. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { phone } = requestOtpSchema.parse({ phone: body.phone });

    const ip = await getRequestIp();
    await enforceRateLimit(`otp-request:ip:${ip}`, { limit: 10, windowSeconds: 900 });
    await enforceRateLimit(`otp-request:phone:${phone}`, { limit: 5, windowSeconds: 900 });

    const result = await requestOtp(phone);
    return NextResponse.json(result);
  } catch (error) {
    return mobileErrorResponse(error, "Couldn't send a verification code right now. Please try again.");
  }
}
