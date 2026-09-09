"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/modules/auth/services/current-session.service";
import { requirePermission } from "@/modules/auth/services/authorization.service";
import { prisma } from "@/db/client";
import {
  createUser,
  assignRoleToUser,
  setUserStatus,
  revokeUserRole,
  userHasRole,
} from "@/modules/users/services/user.service";
import { withSafeErrors } from "@/lib/errors";

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

/**
 * Only an actor who already holds SUPER_ADMIN can grant SUPER_ADMIN to someone
 * else. Without this, any ADMIN with the (legitimately granted) `roles.assign`
 * permission could create a new account and hand it SUPER_ADMIN, escalating
 * past their own level.
 */
async function assertCanGrantRole(actingUserId: string, roleId: string): Promise<void> {
  const role = await prisma.role.findUniqueOrThrow({ where: { id: roleId } });
  if (role.name !== "SUPER_ADMIN") return;
  const actorIsSuperAdmin = await userHasRole(actingUserId, "SUPER_ADMIN");
  if (!actorIsSuperAdmin) {
    throw new Error("Only a Super Admin can grant the Super Admin role.");
  }
}

export const createStaffAction = withSafeErrors(async (input: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  password: string;
  roleId: string;
  branchId?: string | null;
}) => {
  const actingUserId = await requireUserId();
  await requirePermission(actingUserId, "users", "create", null);
  await assertCanGrantRole(actingUserId, input.roleId);

  const user = await createUser({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email || undefined,
    phone: input.phone || undefined,
    password: input.password,
  });
  await assignRoleToUser({ userId: user.id, roleId: input.roleId, branchId: input.branchId ?? null });

  revalidatePath("/admin/staff");
  return user;
}, "Couldn't create that staff account right now. Please try again.");

export const assignRoleToStaffAction = withSafeErrors(async (input: { userId: string; roleId: string; branchId?: string | null }) => {
  const actingUserId = await requireUserId();
  await requirePermission(actingUserId, "users", "update", null);
  await assertCanGrantRole(actingUserId, input.roleId);

  const userRole = await assignRoleToUser({
    userId: input.userId,
    roleId: input.roleId,
    branchId: input.branchId ?? null,
  });
  revalidatePath("/admin/staff");
  return userRole;
}, "Couldn't assign that role right now. Please try again.");

export const revokeStaffRoleAction = withSafeErrors(async (userRoleId: string) => {
  const actingUserId = await requireUserId();
  await requirePermission(actingUserId, "users", "update", null);
  await revokeUserRole(userRoleId);
  revalidatePath("/admin/staff");
}, "Couldn't revoke that role right now. Please try again.");

export const deactivateStaffAction = withSafeErrors(async (userId: string) => {
  const actingUserId = await requireUserId();
  await requirePermission(actingUserId, "users", "delete", null);
  await setUserStatus(userId, "DEACTIVATED");
  revalidatePath("/admin/staff");
}, "Couldn't deactivate that account right now. Please try again.");

export const reactivateStaffAction = withSafeErrors(async (userId: string) => {
  const actingUserId = await requireUserId();
  await requirePermission(actingUserId, "users", "update", null);
  await setUserStatus(userId, "ACTIVE");
  revalidatePath("/admin/staff");
}, "Couldn't reactivate that account right now. Please try again.");
