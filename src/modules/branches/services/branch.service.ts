import { prisma } from "@/db/client";
import type { BranchStatus, Prisma } from "@prisma/client";
import { createBranchSchema, updateBranchSchema, type CreateBranchInput, type UpdateBranchInput } from "@/modules/branches/schemas/branch.schema";

export async function listBranches(params: { status?: BranchStatus; branchIds?: string[] | "ALL" } = {}) {
  const where: Prisma.BranchWhereInput = { deletedAt: null };
  if (params.status) where.status = params.status;
  if (params.branchIds && params.branchIds !== "ALL") {
    where.id = { in: params.branchIds };
  }
  return prisma.branch.findMany({
    where,
    include: { city: { include: { region: { include: { country: true } } } } },
    orderBy: { name: "asc" },
  });
}

export async function getBranchById(id: string) {
  return prisma.branch.findFirst({
    where: { id, deletedAt: null },
    include: { city: { include: { region: { include: { country: true } } } } },
  });
}

export async function getBranchBySlug(slug: string) {
  return prisma.branch.findFirst({
    where: { slug, deletedAt: null },
    include: { city: { include: { region: { include: { country: true } } } } },
  });
}

export async function createBranch(input: CreateBranchInput) {
  const data = createBranchSchema.parse(input);
  return prisma.branch.create({ data });
}

export async function updateBranch(id: string, input: UpdateBranchInput) {
  const data = updateBranchSchema.parse(input);
  return prisma.branch.update({ where: { id }, data });
}

/**
 * Branches are never hard-deleted. Deactivation only flips status so the branch
 * stays visible in admin/reporting views (with historical orders intact) but
 * disappears from customer-facing ordering flows. `deletedAt` is reserved for a
 * future archival workflow and is intentionally left untouched here.
 */
export async function deactivateBranch(id: string) {
  return prisma.branch.update({
    where: { id },
    data: { status: "INACTIVE" },
  });
}
