import { PrismaClient } from "@prisma/client";
import { PERMISSION_CATALOG } from "../src/modules/roles/permissions";
import { ROLES, DEFAULT_ROLE_PERMISSIONS } from "../src/modules/roles/roles";
import { hashPassword } from "../src/modules/auth/services/password.service";
import { assignRoleToUser } from "../src/modules/users/services/user.service";
import { recordStockMovement } from "../src/modules/inventory/services/stock.service";
import { createRider } from "../src/modules/delivery/services/rider.service";

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
    // update: also backfills defaultDeliveryFee on branches seeded before this
    // field existed — an empty update object here would silently leave
    // pre-existing rows at the column's schema default (0) forever.
    const branch = await prisma.branch.upsert({
      where: { slug: seed.slug },
      update: { defaultDeliveryFee: 12 },
      create: { ...seed, cityId, status: "ACTIVE", defaultDeliveryFee: 12 },
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
    { name: "Loaded Fries", slug: "loaded-fries", category: "fries", basePrice: 45, station: "fries" },
    { name: "Classic Fries", slug: "classic-fries", category: "fries", basePrice: 25, station: "fries" },
    { name: "Chicken Suya", slug: "chicken-suya", category: "suyas", basePrice: 35, station: "grill" },
    { name: "Beef Suya", slug: "beef-suya", category: "suyas", basePrice: 40, station: "grill" },
    { name: "Cheesy Shawarma", slug: "cheesy-shawarma", category: "wraps", basePrice: 50, station: "shawarma" },
    { name: "Chicken Shawarma", slug: "chicken-shawarma", category: "wraps", basePrice: 45, station: "shawarma" },
    { name: "Jollof Rice with Chicken", slug: "jollof-rice-chicken", category: "rice", basePrice: 55, station: "rice" },
    { name: "Fried Rice with Beef", slug: "fried-rice-beef", category: "rice", basePrice: 60, station: "rice" },
    { name: "Pepperoni Pizza (Medium)", slug: "pepperoni-pizza-medium", category: "pizzas", basePrice: 85, station: "pizza" },
    { name: "Chicken Pizza (Medium)", slug: "chicken-pizza-medium", category: "pizzas", basePrice: 90, station: "pizza" },
    { name: "Fresh Juice", slug: "fresh-juice", category: "drinks", basePrice: 20, station: "drinks" },
    { name: "Soft Drink", slug: "soft-drink", category: "drinks", basePrice: 15, station: "drinks" },
    { name: "Flicks Combo", slug: "flicks-combo", category: "combos", basePrice: 90, station: "packing" },
  ];

  const products: Record<string, { id: string }> = {};
  for (const seed of productSeeds) {
    products[seed.slug] = await prisma.product.upsert({
      where: { slug: seed.slug },
      update: { stationSlug: seed.station },
      create: {
        name: seed.name,
        slug: seed.slug,
        categoryId: categories[seed.category].id,
        basePrice: seed.basePrice,
        stationSlug: seed.station,
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

async function seedKitchenStations(branches: Awaited<ReturnType<typeof seedBranches>>) {
  const stationSeeds = [
    { name: "Grill", slug: "grill", sortOrder: 1 },
    { name: "Fries", slug: "fries", sortOrder: 2 },
    { name: "Shawarma", slug: "shawarma", sortOrder: 3 },
    { name: "Pizza", slug: "pizza", sortOrder: 4 },
    { name: "Rice", slug: "rice", sortOrder: 5 },
    { name: "Drinks", slug: "drinks", sortOrder: 6 },
    { name: "Packing", slug: "packing", sortOrder: 7 },
  ];

  for (const branch of branches) {
    for (const seed of stationSeeds) {
      await prisma.kitchenStation.upsert({
        where: { branchId_slug: { branchId: branch.id, slug: seed.slug } },
        update: {},
        create: { ...seed, branchId: branch.id },
      });
    }
  }
}

async function seedIngredients() {
  const ingredientSeeds = [
    { name: "Chicken Breast", sku: "ING-CHICKEN", unit: "kg", reorderLevel: 5 },
    { name: "Beef", sku: "ING-BEEF", unit: "kg", reorderLevel: 5 },
    { name: "Potatoes", sku: "ING-POTATO", unit: "kg", reorderLevel: 10 },
    { name: "Suya Spice Mix", sku: "ING-SUYASPICE", unit: "kg", reorderLevel: 2 },
    { name: "Cooking Oil", sku: "ING-OIL", unit: "l", reorderLevel: 5 },
    { name: "Jasmine Rice", sku: "ING-RICE", unit: "kg", reorderLevel: 15 },
    { name: "Flatbread Wrap", sku: "ING-WRAP", unit: "pcs", reorderLevel: 20 },
    { name: "Mozzarella Cheese", sku: "ING-CHEESE", unit: "kg", reorderLevel: 3 },
  ];

  const ingredients: Record<string, { id: string }> = {};
  for (const seed of ingredientSeeds) {
    ingredients[seed.sku] = await prisma.ingredient.upsert({
      where: { sku: seed.sku },
      update: {},
      create: seed,
    });
  }
  return ingredients;
}

async function seedRecipes(
  products: Awaited<ReturnType<typeof seedCatalog>>["products"],
  ingredients: Awaited<ReturnType<typeof seedIngredients>>
) {
  const recipeSeeds = [
    { product: "chicken-suya", ingredient: "ING-CHICKEN", quantityPerUnit: 0.2 },
    { product: "chicken-suya", ingredient: "ING-SUYASPICE", quantityPerUnit: 0.02 },
    { product: "beef-suya", ingredient: "ING-BEEF", quantityPerUnit: 0.2 },
    { product: "beef-suya", ingredient: "ING-SUYASPICE", quantityPerUnit: 0.02 },
    { product: "loaded-fries", ingredient: "ING-POTATO", quantityPerUnit: 0.3 },
    { product: "loaded-fries", ingredient: "ING-OIL", quantityPerUnit: 0.05 },
    { product: "classic-fries", ingredient: "ING-POTATO", quantityPerUnit: 0.25 },
    { product: "classic-fries", ingredient: "ING-OIL", quantityPerUnit: 0.04 },
    { product: "jollof-rice-chicken", ingredient: "ING-RICE", quantityPerUnit: 0.25 },
    { product: "jollof-rice-chicken", ingredient: "ING-CHICKEN", quantityPerUnit: 0.15 },
    { product: "chicken-shawarma", ingredient: "ING-WRAP", quantityPerUnit: 1 },
    { product: "chicken-shawarma", ingredient: "ING-CHICKEN", quantityPerUnit: 0.15 },
    { product: "cheesy-shawarma", ingredient: "ING-WRAP", quantityPerUnit: 1 },
    { product: "cheesy-shawarma", ingredient: "ING-CHEESE", quantityPerUnit: 0.08 },
  ];

  for (const seed of recipeSeeds) {
    const productId = products[seed.product].id;
    const ingredientId = ingredients[seed.ingredient].id;
    await prisma.recipeItem.upsert({
      where: { productId_ingredientId: { productId, ingredientId } },
      update: { quantityPerUnit: seed.quantityPerUnit },
      create: { productId, ingredientId, quantityPerUnit: seed.quantityPerUnit },
    });
  }
}

async function seedSuppliers() {
  const supplierSeeds = [
    { name: "Accra Fresh Meats Ltd", phone: "+233201000010", email: "orders@accrafreshmeats.dev" },
    { name: "Greater Accra Produce Co-op", phone: "+233201000020", email: "sales@gaproduce.dev" },
  ];

  const suppliers = [];
  for (const seed of supplierSeeds) {
    const existing = await prisma.supplier.findFirst({ where: { name: seed.name } });
    suppliers.push(existing ?? (await prisma.supplier.create({ data: seed })));
  }
  return suppliers;
}

/** Opening balances so the demo has real stock to sell against and adjust — a fresh ingredient with no movement yet reads as zero, which is correct but not useful for a walkthrough. */
async function seedInitialStock(
  branches: Awaited<ReturnType<typeof seedBranches>>,
  ingredients: Awaited<ReturnType<typeof seedIngredients>>
) {
  const openingQuantities: Record<string, number> = {
    "ING-CHICKEN": 20,
    "ING-BEEF": 15,
    "ING-POTATO": 40,
    "ING-SUYASPICE": 5,
    "ING-OIL": 20,
    "ING-RICE": 50,
    "ING-WRAP": 100,
    "ING-CHEESE": 10,
  };

  for (const branch of branches) {
    for (const [sku, quantity] of Object.entries(openingQuantities)) {
      const ingredientId = ingredients[sku].id;
      const existing = await prisma.branchIngredientStock.findUnique({
        where: { branchId_ingredientId: { branchId: branch.id, ingredientId } },
      });
      if (existing) continue;
      await recordStockMovement({
        branchId: branch.id,
        ingredientId,
        type: "RECEIPT",
        quantityDelta: quantity,
        reason: "Opening stock (seed)",
      });
    }
  }
}

/**
 * areaMatch values are chosen to line up with seedCustomers' addresses below
 * (Ama Owusu -> East Legon, Kwame Mensah -> Achimota, Abena Boateng ->
 * Dansoman) so the dev flow demonstrates real zone matching end-to-end.
 * Mile 7 intentionally gets no zones, to also exercise the
 * Branch.defaultDeliveryFee fallback path.
 */
async function seedDeliveryZones(branches: Awaited<ReturnType<typeof seedBranches>>) {
  const zoneSeeds: Array<{ branchSlug: string; name: string; areaMatch: string; fee: number; estimatedMinutes: number }> = [
    { branchSlug: "east-legon", name: "East Legon", areaMatch: "East Legon", fee: 10, estimatedMinutes: 25 },
    { branchSlug: "east-legon", name: "Airport Residential", areaMatch: "Airport Residential", fee: 15, estimatedMinutes: 35 },
    { branchSlug: "achimota", name: "Achimota", areaMatch: "Achimota", fee: 8, estimatedMinutes: 20 },
    { branchSlug: "dansoman", name: "Dansoman", areaMatch: "Dansoman", fee: 8, estimatedMinutes: 20 },
  ];

  for (const seed of zoneSeeds) {
    const branch = branches.find((b) => b.slug === seed.branchSlug)!;
    await prisma.deliveryZone.upsert({
      where: { branchId_areaMatch: { branchId: branch.id, areaMatch: seed.areaMatch } },
      update: {},
      create: {
        branchId: branch.id,
        name: seed.name,
        areaMatch: seed.areaMatch,
        fee: seed.fee,
        estimatedMinutes: seed.estimatedMinutes,
      },
    });
  }
}

async function seedRider(eastLegonBranchId: string) {
  const email = "rider@dev.flicksandlicks.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  return createRider({
    branchId: eastLegonBranchId,
    firstName: "Kojo",
    lastName: "Boateng",
    email,
    phone: "+233241000099",
    password: DEV_PASSWORD,
    vehicleType: "MOTORBIKE",
    plateNumber: "GR-1234-24",
  });
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

  const frontDeskUser = await prisma.user.upsert({
    where: { email: "front.desk@dev.flicksandlicks.local" },
    update: {},
    create: {
      email: "front.desk@dev.flicksandlicks.local",
      passwordHash,
      firstName: "Front",
      lastName: "Desk",
      name: "Front Desk (East Legon)",
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  const kitchenStaffUser = await prisma.user.upsert({
    where: { email: "kitchen.staff@dev.flicksandlicks.local" },
    update: {},
    create: {
      email: "kitchen.staff@dev.flicksandlicks.local",
      passwordHash,
      firstName: "Kitchen",
      lastName: "Staff",
      name: "Kitchen Staff (East Legon)",
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  const inventoryManagerUser = await prisma.user.upsert({
    where: { email: "inventory.manager@dev.flicksandlicks.local" },
    update: {},
    create: {
      email: "inventory.manager@dev.flicksandlicks.local",
      passwordHash,
      firstName: "Inventory",
      lastName: "Manager",
      name: "Inventory Manager (East Legon)",
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  await assignRoleToUser({ userId: superAdminUser.id, roleId: roleMap[ROLES.SUPER_ADMIN].id, branchId: null });
  await assignRoleToUser({ userId: branchAdminUser.id, roleId: roleMap[ROLES.ADMIN].id, branchId: eastLegonBranchId });
  await assignRoleToUser({ userId: frontDeskUser.id, roleId: roleMap[ROLES.FRONT_DESK].id, branchId: eastLegonBranchId });
  await assignRoleToUser({
    userId: kitchenStaffUser.id,
    roleId: roleMap[ROLES.KITCHEN_STAFF].id,
    branchId: eastLegonBranchId,
  });
  await assignRoleToUser({
    userId: inventoryManagerUser.id,
    roleId: roleMap[ROLES.INVENTORY_MANAGER].id,
    branchId: eastLegonBranchId,
  });

  return { superAdminUser, branchAdminUser, frontDeskUser, kitchenStaffUser, inventoryManagerUser };
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
  const { superAdminUser, branchAdminUser, frontDeskUser, kitchenStaffUser, inventoryManagerUser } = await seedUsers(
    roleMap,
    eastLegon.id
  );

  console.log("Seeding catalog (categories, products, modifiers)...");
  const { categories, products } = await seedCatalog(branches);

  console.log("Seeding kitchen stations...");
  await seedKitchenStations(branches);

  console.log("Seeding ingredients & recipes...");
  const ingredients = await seedIngredients();
  await seedRecipes(products, ingredients);

  console.log("Seeding suppliers...");
  const suppliers = await seedSuppliers();

  console.log("Seeding opening stock...");
  await seedInitialStock(branches, ingredients);

  console.log("Seeding delivery zones...");
  await seedDeliveryZones(branches);

  console.log("Seeding rider...");
  const rider = await seedRider(eastLegon.id);

  console.log("Seeding customers...");
  const customers = await seedCustomers();

  console.log("\nSeed complete.");
  console.log(`Branches: ${branches.map((b) => b.name).join(", ")}`);
  console.log(`Roles: ${Object.keys(roleMap).join(", ")}`);
  console.log(`Categories: ${Object.keys(categories).length}, Products: ${Object.keys(products).length}`);
  console.log(`Ingredients: ${Object.keys(ingredients).length}, Suppliers: ${suppliers.length}`);
  console.log(`Customers: ${customers.length}`);
  console.log("\nDev-only login credentials (never valid outside local/dev):");
  console.log(`  Super Admin — ${superAdminUser.email} / ${DEV_PASSWORD}`);
  console.log(`  Branch Admin (East Legon) — ${branchAdminUser.email} / ${DEV_PASSWORD}`);
  console.log(`  Front Desk (East Legon) — ${frontDeskUser.email} / ${DEV_PASSWORD}`);
  console.log(`  Kitchen Staff (East Legon) — ${kitchenStaffUser.email} / ${DEV_PASSWORD}`);
  console.log(`  Inventory Manager (East Legon) — ${inventoryManagerUser.email} / ${DEV_PASSWORD}`);
  console.log(`  Rider (East Legon) — ${rider.email} / ${DEV_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
