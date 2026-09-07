import { prisma } from "@/db/client";
import { permissionKey } from "@/modules/roles/permissions";

export interface PermissionGrant {
  branchId: string | null;
  permissions: Set<string>;
}

export interface AccessProfile {
  grants: PermissionGrant[];
}

/**
 * A grant with branchId = null is global (applies to every branch — this is how
 * SUPER_ADMIN gets full visibility without any special-cased role check). A grant
 * with a set branchId only satisfies checks scoped to that same branch.
 *
 * Permissions are re-read from the database on every check rather than trusted
 * from a JWT claim, so a role/permission change or session revocation takes
 * effect immediately instead of waiting for a token to expire.
 */
export async function getUserAccessProfile(userId: string): Promise<AccessProfile> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  });

  const grants: PermissionGrant[] = userRoles.map((userRole) => ({
    branchId: userRole.branchId,
    permissions: new Set(
      userRole.role.rolePermissions.map((rolePermission) =>
        permissionKey(rolePermission.permission.resource, rolePermission.permission.action)
      )
    ),
  }));

  return { grants };
}

export function hasPermission(
  profile: AccessProfile,
  resource: string,
  action: string,
  branchId?: string | null
): boolean {
  const key = permissionKey(resource, action);
  return profile.grants.some((grant) => {
    if (!grant.permissions.has(key)) return false;
    if (grant.branchId === null) return true;
    if (branchId == null) return false;
    return grant.branchId === branchId;
  });
}

/**
 * Coarse "can this user do X at all" check that ignores branch scope —
 * for page-level gates that run before any specific branch is known (e.g.
 * "show the POS link" before the user has picked which branch's POS to
 * open). A branch-scoped grant (e.g. FRONT_DESK for East Legon only) counts
 * here even though hasPermission(profile, resource, action) with no branchId
 * argument would reject it — that strictness is correct once a specific
 * branch IS known, which is why this is a separate function rather than a
 * default on hasPermission. Never use this to gate the actual mutation —
 * that must always call hasPermission/requirePermission with the real
 * branchId.
 */
export function hasAnyPermission(profile: AccessProfile, resource: string, action: string): boolean {
  const key = permissionKey(resource, action);
  return profile.grants.some((grant) => grant.permissions.has(key));
}

/** Which branches can this profile act on for a given permission — "ALL" for a global grant. */
export function getAccessibleBranchIds(
  profile: AccessProfile,
  resource: string,
  action: string
): "ALL" | string[] {
  const key = permissionKey(resource, action);
  if (profile.grants.some((grant) => grant.branchId === null && grant.permissions.has(key))) {
    return "ALL";
  }
  return profile.grants
    .filter((grant) => grant.branchId !== null && grant.permissions.has(key))
    .map((grant) => grant.branchId as string);
}

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Throws AuthorizationError if the user lacks the permission. Use at the top of every protected server action / route handler that acts on a branch-owned resource (Order, Cart, Payment, kitchen items, ...) — pass the resource's real branchId. */
export async function requirePermission(
  userId: string,
  resource: string,
  action: string,
  branchId?: string | null
): Promise<AccessProfile> {
  const profile = await getUserAccessProfile(userId);
  if (!hasPermission(profile, resource, action, branchId)) {
    throw new AuthorizationError();
  }
  return profile;
}

/** Same as requirePermission, but for resources with no branch of their own (Customer, the product catalog) — any grant of this permission, branch-scoped or global, is sufficient. */
export async function requireAnyPermission(userId: string, resource: string, action: string): Promise<AccessProfile> {
  const profile = await getUserAccessProfile(userId);
  if (!hasAnyPermission(profile, resource, action)) {
    throw new AuthorizationError();
  }
  return profile;
}
