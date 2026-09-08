import { PrismaClient } from "@prisma/client";
import { ROLES } from "../src/modules/roles/roles";

const prisma = new PrismaClient();

// Additive grants only — adds newly-required permissions to already-seeded
// roles in production without touching any grant already in place.
const NEW_GRANTS: Record<string, Array<{ resource: string; action: string }>> = {
  [ROLES.ADMIN]: [
    { resource: "products", action: "create" },
    { resource: "categories", action: "create" },
    { resource: "categories", action: "update" },
  ],
  [ROLES.FRONT_DESK]: [
    { resource: "delivery", action: "read" },
    { resource: "delivery", action: "update" },
    { resource: "delivery", action: "assign" },
    { resource: "riders", action: "read" },
  ],
};

async function main() {
  for (const [roleName, grants] of Object.entries(NEW_GRANTS)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    for (const { resource, action } of grants) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { resource_action: { resource, action } } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
      console.log(`granted ${resource}.${action} to ${roleName}`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
