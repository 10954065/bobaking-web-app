import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { bearerToken, mobileErrorResponse } from "@/lib/mobile-api";
import { getCustomerByBearerToken } from "@/modules/customer-auth/services/current-customer.service";

export const dynamic = "force-dynamic";

/** Lets the app restore a session on launch without redoing OTP, mirroring getCurrentCustomerAction() for the web storefront. */
export async function GET(request: NextRequest) {
  try {
    const token = bearerToken(request);
    if (!token) return NextResponse.json({ customer: null }, { status: 401 });

    const customer = await getCustomerByBearerToken(token);
    if (!customer) return NextResponse.json({ customer: null }, { status: 401 });

    return NextResponse.json({ customer });
  } catch (error) {
    return mobileErrorResponse(error, "Couldn't check your session right now.");
  }
}
