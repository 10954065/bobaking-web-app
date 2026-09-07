import { prisma } from "@/db/client";
import { hashPassword } from "@/modules/auth/services/password.service";
import { createUserSchema, type CreateUserInput } from "@/modules/users/schemas/user.schema";

export async function findUserByIdentifier(identifier: string) {
  return prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { phone: identifier }],
      deletedAt: null,
    },
  });
}

export async function findUserById(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null } });
}

export async function createUser(input: CreateUserInput) {
  const data = createUserSchema.parse(input);
  if (!data.email && !data.phone) {
    throw new Error("A user requires at least an email or a phone number.");
  }

  const passwordHash = await hashPassword(data.password);

  return prisma.user.create({
    data: {
      email: data.email,
      phone: data.phone,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`,
    },
  });
}

export async function assignRoleToUser(params: { userId: string; roleId: string; branchId?: string | null }) {
  const branchId = params.branchId ?? null;

  // Postgres unique indexes treat NULL as distinct from NULL, so the compound
  // @@unique([userId, roleId, branchId]) alone cannot prevent duplicate *global*
  // grants (branchId = null). A partial unique index covers that case at the DB
  // level (see prisma/migrations .../add_user_role_global_unique); this
  // find-then-create keeps the ORM-level call idempotent to match.
  const existing = await prisma.userRole.findFirst({
    where: { userId: params.userId, roleId: params.roleId, branchId },
  });
  if (existing) return existing;

  return prisma.userRole.create({
    data: { userId: params.userId, roleId: params.roleId, branchId },
  });
}
