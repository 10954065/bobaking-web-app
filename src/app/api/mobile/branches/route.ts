import { NextResponse } from "next/server";
import { mobileErrorResponse } from "@/lib/mobile-api";
import { listBranches } from "@/modules/branches/services/branch.service";

export const dynamic = "force-dynamic";

/** No auth — the public "choose a branch" step, same as getStorefrontBranchesAction(). */
export async function GET() {
  try {
    const branches = await listBranches({ status: "ACTIVE" });
    return NextResponse.json({
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        latitude: b.latitude != null ? Number(b.latitude) : null,
        longitude: b.longitude != null ? Number(b.longitude) : null,
      })),
    });
  } catch (error) {
    return mobileErrorResponse(error, "Couldn't load branches right now. Please refresh and try again.");
  }
}
