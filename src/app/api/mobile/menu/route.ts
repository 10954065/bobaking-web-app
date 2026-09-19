import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { mobileErrorResponse } from "@/lib/mobile-api";
import { listCategories } from "@/modules/categories/services/category.service";
import { listPosProducts } from "@/modules/pos/services/pos-catalog.service";

export const dynamic = "force-dynamic";

/** ?branchId= is required — pricing/availability are branch-resolved, same as getStorefrontMenuAction(). */
export async function GET(request: NextRequest) {
  try {
    const branchId = request.nextUrl.searchParams.get("branchId");
    if (!branchId) {
      return NextResponse.json({ error: "branchId is required." }, { status: 400 });
    }

    const [categories, products] = await Promise.all([listCategories(), listPosProducts(branchId)]);
    return NextResponse.json({
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
      products,
    });
  } catch (error) {
    return mobileErrorResponse(error, "Couldn't load the menu right now. Please try again.");
  }
}
