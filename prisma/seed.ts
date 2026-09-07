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

async function seedCatalog(branches: Awaited<ReturnType<typeof seedBranches>>) {
  const mile7 = branches.find((b) => b.slug === "mile-7")!;
  const eastLegon = branches.find((b) => b.slug === "east-legon")!;

  const categorySeeds = [
    { name: "Pizzas", slug: "pizzas", sortOrder: 1 },
    { name: "Fries", slug: "fries", sortOrder: 2 },
    { name: "Suyas", slug: "suyas", sortOrder: 3 },
    { name: "Rice", slug: "rice", sortOrder: 4 },
    { name: "Wraps", slug: "wraps", sortOrder: 5 },
    { name: "Drinks", slug: "drinks", sortOrder: 6 },
    { name: "Combos", slug: "combos", sortOrder: 7 },
    { name: "Sides", slug: "sides", sortOrder: 8 },
    { name: "Extras", slug: "extras", sortOrder: 9 },
  ];

  const categories: Record<string, { id: string }> = {};
  for (const seed of categorySeeds) {
    categories[seed.slug] = await prisma.category.upsert({
      where: { slug: seed.slug },
      update: {},
      create: seed,
    });
  }

  const productSeeds = [
    { name: "Loaded Fries", slug: "loaded-fries", category: "fries", basePrice: 45 },
    { name: "Classic Fries", slug: "classic-fries", category: "fries", basePrice: 25 },
    { name: "Chicken Suya", slug: "chicken-suya", category: "suyas", basePrice: 35 },
    { name: "Beef Suya", slug: "beef-suya", category: "suyas", basePrice: 40 },
    { name: "Cheesy Shawarma", slug: "cheesy-shawarma", category: "wraps", basePrice: 50 },
    { name: "Chicken Shawarma", slug: "chicken-shawarma", category: "wraps", basePrice: 45 },
    { name: "Jollof Rice with Chicken", slug: "jollof-rice-chicken", category: "rice", basePrice: 55 },
    { name: "Fried Rice with Beef", slug: "fried-rice-beef", category: "rice", basePrice: 60 },
    { name: "Pepperoni Pizza (Medium)", slug: "pepperoni-pizza-medium", category: "pizzas", basePrice: 85 },
    { name: "Chicken Pizza (Medium)", slug: "chicken-pizza-medium", category: "pizzas", basePrice: 90 },
    { name: "Fresh Juice", slug: "fresh-juice", category: "drinks", basePrice: 20 },
    { name: "Soft Drink", slug: "soft-drink", category: "drinks", basePrice: 15 },
    { name: "Flicks Combo", slug: "flicks-combo", category: "combos", basePrice: 90 },
  ];

  const products: Record<string, { id: string }> = {};
  for (const seed of productSeeds) {
    products[seed.slug] = await prisma.product.upsert({
      where: { slug: seed.slug },
      update: {},
      create: {
        name: seed.name,
        slug: seed.slug,
        categoryId: categories[seed.category].id,
        basePrice: seed.basePrice,
      },
    });
  }

  // Demonstrates the branch-override mechanic: Mile 7 doesn't carry pizza yet,
  // and East Legon charges a premium on the shawarma.
  await prisma.productBranchOverride.upsert({
    where: { productId_branchId: { productId: products["pepperoni-pizza-medium"].id, branchId: mile7.id } },
    update: {},
    create: { productId: products["pepperoni-pizza-medium"].id, branchId: mile7.id, isAvailable: false },
  });
  await prisma.productBranchOverride.upsert({
    where: { productId_branchId: { productId: products["chicken-pizza-medium"].id, branchId: mile7.id } },
    update: {},
    create: { productId: products["chicken-pizza-medium"].id, branchId: mile7.id, isAvailable: false },
  });
  await prisma.productBranchOverride.upsert({
    where: { productId_branchId: { productId: products["cheesy-shawarma"].id, branchId: eastLegon.id } },
    update: {},
    create: { productId: products["cheesy-shawarma"].id, branchId: eastLegon.id, price: 58 },
  });

  // Modifier groups shared across the fries/suya items.
  const spiceLevel =
    (await prisma.modifierGroup.findFirst({ where: { name: "Spice Level" } })) ??
    (await prisma.modifierGroup.create({
      data: { name: "Spice Level", selectionType: "SINGLE", isRequired: true, minSelect: 1, maxSelect: 1 },
    }));
  const extras =
    (await prisma.modifierGroup.findFirst({ where: { name: "Extras" } })) ??
    (await prisma.modifierGroup.create({
      data: { name: "Extras", selectionType: "MULTIPLE", isRequired: false, minSelect: 0 },
    }));

  const spiceOptions = [
    { name: "Mild", priceDelta: 0, sortOrder: 1 },
    { name: "Medium", priceDelta: 0, sortOrder: 2 },
    { name: "Hot", priceDelta: 0, sortOrder: 3 },
  ];
  for (const opt of spiceOptions) {
    const existing = await prisma.modifierOption.findFirst({
      where: { modifierGroupId: spiceLevel.id, name: opt.name },
    });
    if (!existing) {
      await prisma.modifierOption.create({ data: { ...opt, modifierGroupId: spiceLevel.id } });
    }
  }

  const extraOptions = [
    { name: "Extra Cheese", priceDelta: 10, sortOrder: 1 },
    { name: "Extra Sauce", priceDelta: 5, sortOrder: 2 },
  ];
  for (const opt of extraOptions) {
    const existing = await prisma.modifierOption.findFirst({
      where: { modifierGroupId: extras.id, name: opt.name },
    });
    if (!existing) {
      await prisma.modifierOption.create({ data: { ...opt, modifierGroupId: extras.id } });
    }
  }

  for (const slug of ["loaded-fries", "chicken-suya", "beef-suya"]) {
    await prisma.productModifierGroup.upsert({
      where: { productId_modifierGroupId: { productId: products[slug].id, modifierGroupId: spiceLevel.id } },
      update: {},
      create: { productId: products[slug].id, modifierGroupId: spiceLevel.id, sortOrder: 1 },
    });
    await prisma.productModifierGroup.upsert({
      where: { productId_modifierGroupId: { productId: products[slug].id, modifierGroupId: extras.id } },
      update: {},
      create: { productId: products[slug].id, modifierGroupId: extras.id, sortOrder: 2 },
    });
  }

  return { categories, products };
}

async function seedCustomers() {
  const customerSeeds = [
    {
      email: "ama.owusu@dev.flicksandlicks.local",
      firstName: "Ama",
      lastName: "Owusu",
      phone: "+233241000001",
      address: { addressLine1: "12 Lagos Ave", area: "East Legon", city: "Accra", isDefault: true },
    },
    {
      email: "kwame.mensah@dev.flicksandlicks.local",
      firstName: "Kwame",
      lastName: "Mensah",
      phone: "+233241000002",
      address: { addressLine1: "5 Achimota Ring Road", area: "Achimota", city: "Accra", isDefault: true },
    },
    {
      email: "abena.boateng@dev.flicksandlicks.local",
      firstName: "Abena",
      lastName: "Boateng",
      phone: "+233241000003",
      address: { addressLine1: "34 Dansoman High Street", area: "Dansoman", city: "Accra", isDefault: true },
    },
  ];

  const customers = [];
  for (const seed of customerSeeds) {
    const customer = await prisma.customer.upsert({
      where: { email: seed.email },
      update: {},
      create: {
        email: seed.email,
        phone: seed.phone,
        firstName: seed.firstName,
        lastName: seed.lastName,
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });

    const existingAddress = await prisma.customerAddress.findFirst({ where: { customerId: customer.id } });
    if (!existingAddress) {
      await prisma.customerAddress.create({ data: { ...seed.address, customerId: customer.id } });
    }

    customers.push(customer);
  }
  return customers;
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

  console.log("Seeding catalog (categories, products, modifiers)...");
  const { categories, products } = await seedCatalog(branches);

  console.log("Seeding customers...");
  const customers = await seedCustomers();

  console.log("\nSeed complete.");
  console.log(`Branches: ${branches.map((b) => b.name).join(", ")}`);
  console.log(`Roles: ${Object.keys(roleMap).join(", ")}`);
  console.log(`Categories: ${Object.keys(categories).length}, Products: ${Object.keys(products).length}`);
  console.log(`Customers: ${customers.length}`);
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
