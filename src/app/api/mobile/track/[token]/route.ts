import { NextResponse } from "next/server";
import { mobileErrorResponse } from "@/lib/mobile-api";
import { getPublicOrderTracking } from "@/modules/orders/services/order-tracking.service";

export const dynamic = "force-dynamic";

/**
 * No auth beyond the token itself — same PII-scrubbed public contract as
 * /track/[token] on the web (see order-tracking.service.ts's doc comment).
 * Pair this with GET /api/realtime/order/[orderId]/status|location?token=
 * for live push updates once the app has orderId + trackingToken from here.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const tracking = await getPublicOrderTracking(token);
    if (!tracking) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    return NextResponse.json(tracking);
  } catch (error) {
    return mobileErrorResponse(error, "Couldn't load order tracking right now. Please try again.");
  }
}
