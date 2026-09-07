import { prisma } from "@/db/client";

export async function listStationsForBranch(branchId: string) {
  return prisma.kitchenStation.findMany({
    where: { branchId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}
