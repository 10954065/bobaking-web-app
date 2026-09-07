import { PrismaClient } from "@prisma/client";
import { PERMISSION_CATALOG } from "../src/modules/roles/permissions";
import { ROLES, DEFAULT_ROLE_PERMISSIONS } from "../src/modules/roles/roles";
import { hashPassword } from "../src/modules/auth/services/password.service";
import { assignRoleToUser } from "../src/modules/users/services/user.service";

const prisma = new PrismaClient();

// Development-only credentials. Never used in production — the platform
// requires real users to be created through the normal signup/invite flow.
const DEV_PASSWORD = "DevOnly!12345";

async function seedGeography() {
  const ghana = await prisma.country.upsert({
    where: { isoCode: "GH" },
    update: {},
    create: { name: "Ghana", isoCode: "GH", currency: "GHS" },
  });

  const greaterAccra = await prisma.region.upsert({
    where: { countryId_name: { countryId: ghana.id, name: "Greater Accra" } },
    update: {},
    create: { name: "Greater Accra", countryId: ghana.id },
  });

  const accra = await prisma.city.upsert({
    where: { regionId_name: { regionId: greaterAccra.id, name: "Accra" } },
    update: {},
    create: { name: "Accra", regionId: greaterAccra.id },
  });

  return { ghana, greaterAccra, accra };
}

async function seedBranches(cityId: string) {
  const branchSeeds = [
    { name: "Mile 7 T-Junction", slug: "mile-7", address: "Mile 7 T-Junction, Accra" },
    { name: "Kingsby Achimota", slug: "achimota", address: "Achimota, Accra" },
    { name: "East Legon", slug: "east-legon", address: "East Legon, Accra" },
    { name: "Dansoman", slug: "dansoman", address: "Dansoman, Accra" },
  ];

  const branches = [];
  for (const seed of branchSeeds) {
    const branch = await prisma.branch.upsert({
      where: { slug: seed.slug },
      update: {},
      create: { ...seed, cityId, status: "ACTIVE" },
    });
    branches.push(branch);
  }
  return branches;
}

async function seedPermissions() {
  const permissions = [];
  for (const def of PERMISSION_CATALOG) {
    const permission = await prisma.permission.upsert({
      where: { resource_action: { resource: def.resource, action: def.action } },
      update: { description: def.description },
      create: def,
    });
    permissions.push(permission);
  }
  return permissions;
}

async function seedRoles(allPermissions: Awaited<ReturnType<typeof seedPermissions>>) {
  const permissionByKey = new Map(allPermissions.map((p) => [`${p.resource}.${p.action}`, p]));

  // SUPER_ADMIN always gets the full, current permission catalog — computed
  // rather than listed, so it can never silently drift out of date.
  const superAdmin = await prisma.role.upsert({
    where: { name: ROLES.SUPER_ADMIN },
    update: {},
    create: { name: ROLES.SUPER_ADMIN, description: "Full platform access across all branches", isSystem: true },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: superAdmin.id } });
  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({ roleId: superAdmin.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  const roleMap: Record<string, { id: string }> = { [ROLES.SUPER_ADMIN]: superAdmin };

  for (const [roleName, permissionKeys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, isSystem: true },
    });

    const permissionIds = permissionKeys
      .map((key) => permissionByKey.get(key)?.id)
      .filter((id): id is string => !!id);

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });

    roleMap[roleName] = role;
  }

  return roleMap;
}

async function seedUsers(roleMap: Record<string, { id: string }>, eastLegonBranchId: string) {
  const passwordHash = await hashPassword(DEV_PASSWORD);

  const superAdminUser = await prisma.user.upsert({
    where: { email: "super.admin@dev.flicksandlicks.local" },
    update: {},
    create: {
      email: "super.admin@dev.flicksandlicks.local",
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      name: "Super Admin",
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  const branchAdminUser = await prisma.user.upsert({
    where: { email: "branch.admin@dev.flicksandlicks.local" },
    update: {},
    create: {
      email: "branch.admin@dev.flicksandlicks.local",
      passwordHash,
      firstName: "Branch",
      lastName: "Admin",
      name: "Branch Admin (East Legon)",
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  await assignRoleToUser({ userId: superAdminUser.id, roleId: roleMap[ROLES.SUPER_ADMIN].id, branchId: null });
  await assignRoleToUser({ userId: branchAdminUser.id, roleId: roleMap[ROLES.ADMIN].id, branchId: eastLegonBranchId });

  return { superAdminUser, branchAdminUser };
}

async function main() {
  console.log("Seeding geography...");
  const { accra } = await seedGeography();

  console.log("Seeding branches...");
  const branches = await seedBranches(accra.id);
  const eastLegon = branches.find((b) => b.slug === "east-legon")!;

  console.log("Seeding permission catalog...");
  const permissions = await seedPermissions();

  console.log("Seeding roles...");
  const roleMap = await seedRoles(permissions);

  console.log("Seeding development users...");
  const { superAdminUser, branchAdminUser } = await seedUsers(roleMap, eastLegon.id);

  console.log("\nSeed complete.");
  console.log(`Branches: ${branches.map((b) => b.name).join(", ")}`);
  console.log(`Roles: ${Object.keys(roleMap).join(", ")}`);
  console.log("\nDev-only login credentials (never valid outside local/dev):");
  console.log(`  Super Admin — ${superAdminUser.email} / ${DEV_PASSWORD}`);
  console.log(`  Branch Admin (East Legon) — ${branchAdminUser.email} / ${DEV_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
