import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestIp, enforceRateLimit } from "@/lib/rate-limit";
import { bearerToken, mobileErrorResponse } from "@/lib/mobile-api";
import { UserFacingError } from "@/lib/errors";
import { getCustomerByBearerToken } from "@/modules/customer-auth/services/current-customer.service";
import { placeStorefrontOrderSchema } from "@/modules/storefront/schemas/storefront.schema";
import { placeStorefrontOrder } from "@/modules/storefront/services/storefront.service";
import { listOrdersForCustomer } from "@/modules/orders/services/order.service";

export const dynamic = "force-dynamic";

async function requireCustomer(request: NextRequest) {
  const token = bearerToken(request);
  const customer = token ? await getCustomerByBearerToken(token) : null;
  if (!customer) throw new UserFacingError("Please verify your phone number before continuing.");
  return customer;
}

/**
 * Mobile counterpart to placeStorefrontOrderAction (storefront.actions.ts) —
 * identity comes from the Bearer session, never the request body, same as
 * the web storefront's cookie session.
 */
export async function POST(request: NextRequest) {
  try {
    const customer = await requireCustomer(request);

    const ip = await getRequestIp();
    await enforceRateLimit(`storefront-order:${ip}`, { limit: 8, windowSeconds: 900 });

    const body = await request.json().catch(() => ({}));
    const input = placeStorefrontOrderSchema.parse(body);

    const order = await placeStorefrontOrder(customer.id, input);
    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
      trackingToken: order.trackingToken,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      taxTotal: Number(order.taxTotal),
      deliveryFee: Number(order.deliveryFee),
    });
  } catch (error) {
    return mobileErrorResponse(error, "We couldn't place your order right now. Please try again in a moment.");
  }
}

/** This customer's order history, for the app's order-history screen — mirrors the /my-account page's data source. */
export async function GET(request: NextRequest) {
  try {
    const customer = await requireCustomer(request);
    const orders = await listOrdersForCustomer(customer.id);

    return NextResponse.json({
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        trackingToken: order.trackingToken,
        status: order.status,
        type: order.type,
        branchName: order.branch.name,
        total: Number(order.total),
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({ productName: item.productName, quantity: item.quantity })),
      })),
    });
  } catch (error) {
    return mobileErrorResponse(error, "Couldn't load your orders right now. Please try again.");
  }
}
