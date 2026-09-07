import { prisma } from "@/db/client";
import type { Prisma } from "@prisma/client";

export interface RecordAuditLogInput {
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  branchId?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Append-only audit trail. This is the only write path to AuditLog in the
 * codebase — never expose update/delete for audit rows.
 */
export async function recordAuditLog(input: RecordAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      branchId: input.branchId ?? null,
      before: input.before ?? undefined,
      after: input.after ?? undefined,
      metadata: input.metadata ?? undefined,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}
