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

  const centralRegion = await prisma.region.upsert({
    where: { countryId_name: { countryId: ghana.id, name: "Central Region" } },
    update: {},
    create: { name: "Central Region", countryId: ghana.id },
  });

  const winneba = await prisma.city.upsert({
    where: { regionId_name: { regionId: centralRegion.id, name: "Winneba" } },
    update: {},
    create: { name: "Winneba", regionId: centralRegion.id },
  });

  return { ghana, centralRegion, winneba };
}

async function seedBranches(cityId: string) {
  const branch = await prisma.branch.upsert({
    where: { slug: "winneba-uew" },
    update: { defaultDeliveryFee: 8, latitude: 5.3512, longitude: -0.6228 },
    create: {
      name: "Boba King — Winneba (UEW)",
      slug: "winneba-uew",
      address: "Yeenua Street, near UEW North Campus, Winneba",
      cityId,
      status: "ACTIVE",
      phone: "0248978606",
      defaultDeliveryFee: 8,
      latitude: 5.3512,
      longitude: -0.6228,
      openingHours: {
        mon: { open: "11:00", close: "21:00" },
        tue: { open: "11:00", close: "21:00" },
        wed: { open: "11:00", close: "21:00" },
        thu: { open: "11:00", close: "21:00" },
        fri: { open: "11:00", close: "22:00" },
        sat: { open: "11:00", close: "22:00" },
        sun: { open: "12:00", close: "21:00" },
      },
    },
  });

  return [branch];
}

/**
 * Deletes a role (and its seeded dev user, if any) that used to exist in
 * DEFAULT_ROLE_PERMISSIONS but has since been retired — e.g. INVENTORY_MANAGER,
 * folded into ADMIN/BRANCH_MANAGER once this went online-only. Without this,
 * a dev database seeded before the retirement keeps a dangling role/user
 * forever, since seedRoles only ever upserts roles it currently knows about.
 */
async function removeRetiredRole(roleName: string, devUserEmail: string) {
  await prisma.user.deleteMany({ where: { email: devUserEmail } });
  await prisma.role.deleteMany({ where: { name: roleName } });
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

async function seedCatalog() {
  const categorySeeds = [
    { name: "Milk Tea", slug: "milk-tea", sortOrder: 1 },
    { name: "Fruit Tea", slug: "fruit-tea", sortOrder: 2 },
    { name: "Brown Sugar Series", slug: "brown-sugar", sortOrder: 3 },
    { name: "Specialty Lattes", slug: "specialty-lattes", sortOrder: 4 },
    { name: "Waffles", slug: "waffles", sortOrder: 5 },
    { name: "Combos", slug: "combos", sortOrder: 6 },
  ];

  const categories: Record<string, { id: string }> = {};
  for (const seed of categorySeeds) {
    categories[seed.slug] = await prisma.category.upsert({
      where: { slug: seed.slug },
      update: {},
      create: seed,
    });
  }

  // Prices and item names are anchored to what @bobaking_gh has actually
  // posted (Taro 65, Matcha 45, Strawberry 45, Strawberry Matcha Latte 105);
  // everything else fills out a realistic full boba-shop menu around those
  // confirmed anchors until a full official price list replaces it.
  const productSeeds = [
    { name: "Classic Milk Tea", slug: "classic-milk-tea", category: "milk-tea", basePrice: 35, station: "tea-bar" },
    { name: "Taro Milk Tea", slug: "taro-milk-tea", category: "milk-tea", basePrice: 65, station: "tea-bar" },
    { name: "Matcha Milk Tea", slug: "matcha-milk-tea", category: "milk-tea", basePrice: 45, station: "tea-bar" },
    { name: "Strawberry Milk Tea", slug: "strawberry-milk-tea", category: "milk-tea", basePrice: 45, station: "tea-bar" },
    { name: "Blueberry Milk Tea", slug: "blueberry-milk-tea", category: "milk-tea", basePrice: 45, station: "tea-bar" },
    {
      name: "Mango Milk Tea x Biscoff x Caramel",
      slug: "mango-biscoff-milk-tea",
      category: "milk-tea",
      basePrice: 50,
      station: "tea-bar",
    },
    { name: "Passion Fruit Tea", slug: "passion-fruit-tea", category: "fruit-tea", basePrice: 40, station: "tea-bar" },
    { name: "Lychee Fruit Tea", slug: "lychee-fruit-tea", category: "fruit-tea", basePrice: 40, station: "tea-bar" },
    { name: "Peach Fruit Tea", slug: "peach-fruit-tea", category: "fruit-tea", basePrice: 40, station: "tea-bar" },
    { name: "Green Apple Fruit Tea", slug: "green-apple-fruit-tea", category: "fruit-tea", basePrice: 40, station: "tea-bar" },
    {
      name: "Brown Sugar Boba Milk Tea",
      slug: "brown-sugar-boba-milk-tea",
      category: "brown-sugar",
      basePrice: 50,
      station: "tea-bar",
      description: "Rich brown sugar syrup, creamy milk tea, chewy boba pearls.",
    },
    {
      name: "Brown Sugar Pearl Latte",
      slug: "brown-sugar-pearl-latte",
      category: "brown-sugar",
      basePrice: 55,
      station: "tea-bar",
    },
    {
      name: "Strawberry Matcha Latte",
      slug: "strawberry-matcha-latte",
      category: "specialty-lattes",
      basePrice: 105,
      station: "tea-bar",
      description: "A creamy blend of rich matcha, fresh strawberry puree, milk, and chewy boba pearls.",
    },
    { name: "Matcha Latte", slug: "matcha-latte", category: "specialty-lattes", basePrice: 55, station: "tea-bar" },
    { name: "Taro Latte", slug: "taro-latte", category: "specialty-lattes", basePrice: 60, station: "tea-bar" },
    { name: "Classic Waffle", slug: "classic-waffle", category: "waffles", basePrice: 30, station: "waffle-station" },
    {
      name: "Waffle with Ice Cream",
      slug: "waffle-ice-cream",
      category: "waffles",
      basePrice: 45,
      station: "waffle-station",
    },
    {
      name: "Loaded Waffle",
      slug: "loaded-waffle",
      category: "waffles",
      basePrice: 55,
      station: "waffle-station",
      description: "Fresh waffle with chocolate, caramel and your pick of toppings.",
    },
    {
      name: "Waffle & Milk Tea Combo",
      slug: "waffle-milk-tea-combo",
      category: "combos",
      basePrice: 70,
      station: "packing",
      description: "Any classic waffle paired with a premium milk tea of your choice.",
    },
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
        description: "description" in seed ? seed.description : undefined,
      },
    });
  }

  // Modifier groups shared across the tea/latte menu, plus a smaller set for
  // waffles — every boba order needs a sugar level, ice level and size call,
  // with toppings optional on top.
  const sugarLevel =
    (await prisma.modifierGroup.findFirst({ where: { name: "Sugar Level" } })) ??
    (await prisma.modifierGroup.create({
      data: { name: "Sugar Level", selectionType: "SINGLE", isRequired: true, minSelect: 1, maxSelect: 1 },
    }));
  const iceLevel =
    (await prisma.modifierGroup.findFirst({ where: { name: "Ice Level" } })) ??
    (await prisma.modifierGroup.create({
      data: { name: "Ice Level", selectionType: "SINGLE", isRequired: true, minSelect: 1, maxSelect: 1 },
    }));
  const size =
    (await prisma.modifierGroup.findFirst({ where: { name: "Size" } })) ??
    (await prisma.modifierGroup.create({
      data: { name: "Size", selectionType: "SINGLE", isRequired: true, minSelect: 1, maxSelect: 1 },
    }));
  const toppings =
    (await prisma.modifierGroup.findFirst({ where: { name: "Toppings" } })) ??
    (await prisma.modifierGroup.create({
      data: { name: "Toppings", selectionType: "MULTIPLE", isRequired: false, minSelect: 0 },
    }));
  const waffleToppings =
    (await prisma.modifierGroup.findFirst({ where: { name: "Waffle Toppings" } })) ??
    (await prisma.modifierGroup.create({
      data: { name: "Waffle Toppings", selectionType: "MULTIPLE", isRequired: false, minSelect: 0 },
    }));

  const optionSeeds: Array<{ group: typeof sugarLevel; name: string; priceDelta: number; sortOrder: number }> = [
    { group: sugarLevel, name: "0% Sugar", priceDelta: 0, sortOrder: 1 },
    { group: sugarLevel, name: "25% Sugar", priceDelta: 0, sortOrder: 2 },
    { group: sugarLevel, name: "50% Sugar", priceDelta: 0, sortOrder: 3 },
    { group: sugarLevel, name: "75% Sugar", priceDelta: 0, sortOrder: 4 },
    { group: sugarLevel, name: "100% Sugar", priceDelta: 0, sortOrder: 5 },
    { group: iceLevel, name: "No Ice", priceDelta: 0, sortOrder: 1 },
    { group: iceLevel, name: "Less Ice", priceDelta: 0, sortOrder: 2 },
    { group: iceLevel, name: "Normal Ice", priceDelta: 0, sortOrder: 3 },
    { group: iceLevel, name: "Extra Ice", priceDelta: 0, sortOrder: 4 },
    { group: size, name: "Regular", priceDelta: 0, sortOrder: 1 },
    { group: size, name: "Large", priceDelta: 10, sortOrder: 2 },
    { group: toppings, name: "Boba Pearls", priceDelta: 5, sortOrder: 1 },
    { group: toppings, name: "Grass Jelly", priceDelta: 5, sortOrder: 2 },
    { group: toppings, name: "Pudding", priceDelta: 5, sortOrder: 3 },
    { group: toppings, name: "Cheese Foam", priceDelta: 8, sortOrder: 4 },
    { group: toppings, name: "Lychee Jelly", priceDelta: 5, sortOrder: 5 },
    { group: toppings, name: "Red Bean", priceDelta: 5, sortOrder: 6 },
    { group: waffleToppings, name: "Chocolate Drizzle", priceDelta: 5, sortOrder: 1 },
    { group: waffleToppings, name: "Caramel Drizzle", priceDelta: 5, sortOrder: 2 },
    { group: waffleToppings, name: "Whipped Cream", priceDelta: 5, sortOrder: 3 },
    { group: waffleToppings, name: "Ice Cream Scoop", priceDelta: 10, sortOrder: 4 },
    { group: waffleToppings, name: "Biscoff Crumble", priceDelta: 8, sortOrder: 5 },
  ];

  for (const opt of optionSeeds) {
    const existing = await prisma.modifierOption.findFirst({
      where: { modifierGroupId: opt.group.id, name: opt.name },
    });
    if (!existing) {
      await prisma.modifierOption.create({
        data: { name: opt.name, priceDelta: opt.priceDelta, sortOrder: opt.sortOrder, modifierGroupId: opt.group.id },
      });
    }
  }

  const drinkSlugs = [
    "classic-milk-tea",
    "taro-milk-tea",
    "matcha-milk-tea",
    "strawberry-milk-tea",
    "blueberry-milk-tea",
    "mango-biscoff-milk-tea",
    "passion-fruit-tea",
    "lychee-fruit-tea",
    "peach-fruit-tea",
    "green-apple-fruit-tea",
    "brown-sugar-boba-milk-tea",
    "brown-sugar-pearl-latte",
    "strawberry-matcha-latte",
    "matcha-latte",
    "taro-latte",
  ];
  for (const slug of drinkSlugs) {
    const groups = [sugarLevel, iceLevel, size, toppings];
    for (const [index, group] of groups.entries()) {
      await prisma.productModifierGroup.upsert({
        where: { productId_modifierGroupId: { productId: products[slug].id, modifierGroupId: group.id } },
        update: {},
        create: { productId: products[slug].id, modifierGroupId: group.id, sortOrder: index + 1 },
      });
    }
  }

  const waffleSlugs = ["classic-waffle", "waffle-ice-cream", "loaded-waffle"];
  for (const slug of waffleSlugs) {
    await prisma.productModifierGroup.upsert({
      where: { productId_modifierGroupId: { productId: products[slug].id, modifierGroupId: waffleToppings.id } },
      update: {},
      create: { productId: products[slug].id, modifierGroupId: waffleToppings.id, sortOrder: 1 },
    });
  }

  return { categories, products };
}

async function seedCustomers() {
  const customerSeeds = [
    {
      email: "ama.owusu@dev.bobaking.local",
      firstName: "Ama",
      lastName: "Owusu",
      phone: "+233241000001",
      address: {
        addressLine1: "Yeenua Street",
        area: "UEW North Campus",
        city: "Winneba",
        isDefault: true,
        latitude: 5.3524,
        longitude: -0.6219,
      },
    },
    {
      email: "kwame.mensah@dev.bobaking.local",
      firstName: "Kwame",
      lastName: "Mensah",
      phone: "+233241000002",
      address: {
        addressLine1: "Winneba Township Road",
        area: "Winneba Township",
        city: "Winneba",
        isDefault: true,
        latitude: 5.3505,
        longitude: -0.6255,
      },
    },
    {
      email: "abena.boateng@dev.bobaking.local",
      firstName: "Abena",
      lastName: "Boateng",
      phone: "+233241000003",
      address: {
        addressLine1: "Trafalgar Square Road",
        area: "Trafalgar Square",
        city: "Winneba",
        isDefault: true,
        latitude: 5.353,
        longitude: -0.6212,
      },
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
    } else if (existingAddress.latitude == null || existingAddress.longitude == null) {
      // Backfills coordinates onto addresses seeded before this field was
      // populated here, so the distance-based fare path (fare.service.ts)
      // has real data to exercise instead of always falling through to the
      // flat zone/default fee.
      await prisma.customerAddress.update({
        where: { id: existingAddress.id },
        data: { latitude: seed.address.latitude, longitude: seed.address.longitude },
      });
    }

    customers.push(customer);
  }
  return customers;
}

async function seedKitchenStations(branches: Awaited<ReturnType<typeof seedBranches>>) {
  const stationSeeds = [
    { name: "Tea Bar", slug: "tea-bar", sortOrder: 1 },
    { name: "Waffle Station", slug: "waffle-station", sortOrder: 2 },
    { name: "Packing", slug: "packing", sortOrder: 3 },
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
    { name: "Black Tea", sku: "ING-BLACKTEA", unit: "l", reorderLevel: 5 },
    { name: "Green Tea", sku: "ING-GREENTEA", unit: "l", reorderLevel: 5 },
    { name: "Fresh Milk", sku: "ING-MILK", unit: "l", reorderLevel: 10 },
    { name: "Tapioca Pearls (Boba)", sku: "ING-BOBA", unit: "kg", reorderLevel: 5 },
    { name: "Brown Sugar Syrup", sku: "ING-BROWNSUGAR", unit: "l", reorderLevel: 3 },
    { name: "Matcha Powder", sku: "ING-MATCHA", unit: "kg", reorderLevel: 1 },
    { name: "Taro Powder", sku: "ING-TARO", unit: "kg", reorderLevel: 1 },
    { name: "Strawberry Puree", sku: "ING-STRAWBERRY", unit: "l", reorderLevel: 2 },
    { name: "Mango Puree", sku: "ING-MANGO", unit: "l", reorderLevel: 2 },
    { name: "Blueberry Syrup", sku: "ING-BLUEBERRY", unit: "l", reorderLevel: 2 },
    { name: "Passion Fruit Syrup", sku: "ING-PASSIONFRUIT", unit: "l", reorderLevel: 2 },
    { name: "Waffle Batter Mix", sku: "ING-WAFFLE", unit: "kg", reorderLevel: 5 },
    { name: "Whipped Cream", sku: "ING-CREAM", unit: "l", reorderLevel: 2 },
    { name: "Biscoff Spread", sku: "ING-BISCOFF", unit: "kg", reorderLevel: 1 },
    { name: "Caramel Sauce", sku: "ING-CARAMEL", unit: "l", reorderLevel: 2 },
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
    { product: "classic-milk-tea", ingredient: "ING-BLACKTEA", quantityPerUnit: 0.15 },
    { product: "classic-milk-tea", ingredient: "ING-MILK", quantityPerUnit: 0.2 },
    { product: "taro-milk-tea", ingredient: "ING-TARO", quantityPerUnit: 0.03 },
    { product: "taro-milk-tea", ingredient: "ING-MILK", quantityPerUnit: 0.2 },
    { product: "taro-milk-tea", ingredient: "ING-BOBA", quantityPerUnit: 0.05 },
    { product: "matcha-milk-tea", ingredient: "ING-MATCHA", quantityPerUnit: 0.02 },
    { product: "matcha-milk-tea", ingredient: "ING-MILK", quantityPerUnit: 0.2 },
    { product: "strawberry-milk-tea", ingredient: "ING-STRAWBERRY", quantityPerUnit: 0.1 },
    { product: "strawberry-milk-tea", ingredient: "ING-MILK", quantityPerUnit: 0.2 },
    { product: "brown-sugar-boba-milk-tea", ingredient: "ING-BROWNSUGAR", quantityPerUnit: 0.08 },
    { product: "brown-sugar-boba-milk-tea", ingredient: "ING-MILK", quantityPerUnit: 0.2 },
    { product: "brown-sugar-boba-milk-tea", ingredient: "ING-BOBA", quantityPerUnit: 0.08 },
    { product: "strawberry-matcha-latte", ingredient: "ING-MATCHA", quantityPerUnit: 0.02 },
    { product: "strawberry-matcha-latte", ingredient: "ING-STRAWBERRY", quantityPerUnit: 0.08 },
    { product: "strawberry-matcha-latte", ingredient: "ING-MILK", quantityPerUnit: 0.22 },
    { product: "classic-waffle", ingredient: "ING-WAFFLE", quantityPerUnit: 0.15 },
    { product: "waffle-ice-cream", ingredient: "ING-WAFFLE", quantityPerUnit: 0.15 },
    { product: "waffle-ice-cream", ingredient: "ING-CREAM", quantityPerUnit: 0.05 },
    { product: "loaded-waffle", ingredient: "ING-WAFFLE", quantityPerUnit: 0.15 },
    { product: "loaded-waffle", ingredient: "ING-CARAMEL", quantityPerUnit: 0.03 },
    { product: "loaded-waffle", ingredient: "ING-BISCOFF", quantityPerUnit: 0.03 },
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
    { name: "Accra Bubble Tea Supplies Co.", phone: "+233201000030", email: "orders@accrabubbletea.dev" },
    { name: "Winneba Fresh Milk Depot", phone: "+233201000040", email: "sales@winnebamilk.dev" },
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
    "ING-BLACKTEA": 20,
    "ING-GREENTEA": 15,
    "ING-MILK": 40,
    "ING-BOBA": 15,
    "ING-BROWNSUGAR": 10,
    "ING-MATCHA": 3,
    "ING-TARO": 3,
    "ING-STRAWBERRY": 8,
    "ING-MANGO": 8,
    "ING-BLUEBERRY": 8,
    "ING-PASSIONFRUIT": 8,
    "ING-WAFFLE": 20,
    "ING-CREAM": 8,
    "ING-BISCOFF": 3,
    "ING-CARAMEL": 8,
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
 * areaMatch values are chosen to line up with seedCustomers' addresses above
 * (Ama Owusu -> UEW North Campus, Kwame Mensah -> Winneba Township, Abena
 * Boateng -> Trafalgar Square) so the dev flow demonstrates real zone
 * matching end-to-end. Both the branch and the seeded customer addresses
 * carry coordinates, so a delivery order placed outside a configured zone
 * still prices via the Bolt/Yango-style base+per-km+per-minute distance
 * fallback (fare.service.ts) rather than the flat Branch.defaultDeliveryFee.
 */
async function seedDeliveryZones(branches: Awaited<ReturnType<typeof seedBranches>>) {
  const winneba = branches.find((b) => b.slug === "winneba-uew")!;
  const zoneSeeds: Array<{ name: string; areaMatch: string; fee: number; estimatedMinutes: number }> = [
    { name: "UEW North Campus", areaMatch: "UEW North Campus", fee: 5, estimatedMinutes: 10 },
    { name: "Winneba Township", areaMatch: "Winneba Township", fee: 10, estimatedMinutes: 20 },
    { name: "Trafalgar Square", areaMatch: "Trafalgar Square", fee: 8, estimatedMinutes: 15 },
  ];

  for (const seed of zoneSeeds) {
    await prisma.deliveryZone.upsert({
      where: { branchId_areaMatch: { branchId: winneba.id, areaMatch: seed.areaMatch } },
      update: {},
      create: {
        branchId: winneba.id,
        name: seed.name,
        areaMatch: seed.areaMatch,
        fee: seed.fee,
        estimatedMinutes: seed.estimatedMinutes,
      },
    });
  }
}

async function seedRider(branchId: string) {
  const email = "rider@dev.bobaking.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  return createRider({
    branchId,
    firstName: "Kojo",
    lastName: "Boateng",
    email,
    phone: "+233241000099",
    password: DEV_PASSWORD,
    vehicleType: "MOTORBIKE",
    plateNumber: "CR-1234-24",
  });
}

async function seedPromotions() {
  const promotionSeeds = [
    {
      code: "SIPWELCOME",
      name: "Welcome 10% off",
      description: "10% off for new and returning customers, up to GHS 15.",
      discountType: "PERCENTAGE" as const,
      discountValue: 10,
      maxDiscountAmount: 15,
      usageLimitPerCustomer: 1,
    },
    {
      code: "FOLLOW10",
      name: "GHS 10 off for following @bobaking_gh",
      description: "Follow us on TikTok or Instagram and show us to get GHS 10 off your order.",
      discountType: "FIXED_AMOUNT" as const,
      discountValue: 10,
      usageLimitPerCustomer: 1,
    },
    {
      // The real in-store "Buy 3, Get 1 Free" promo isn't a discount-code
      // mechanic this schema models directly (PromotionDiscountType only
      // covers PERCENTAGE/FIXED_AMOUNT) — approximated here as a fixed
      // discount roughly equal to one average-priced drink, once the order
      // is large enough to plausibly contain 3+ drinks.
      code: "BUY3GET1",
      name: "Buy 3 Get 1 Free (approximated)",
      description: "Buy 3 drinks, get the value of 1 free — applied as a flat discount on qualifying orders.",
      discountType: "FIXED_AMOUNT" as const,
      discountValue: 45,
      minSubtotal: 135,
      usageLimitPerCustomer: 5,
    },
  ];

  const promotions: Record<string, { id: string }> = {};
  for (const seed of promotionSeeds) {
    promotions[seed.code] = await prisma.promotion.upsert({
      where: { code: seed.code },
      update: {},
      create: seed,
    });
  }
  return promotions;
}

async function seedCampaign(promotions: Awaited<ReturnType<typeof seedPromotions>>) {
  const existing = await prisma.campaign.findFirst({ where: { name: "New Customer Sip" } });
  if (existing) return existing;

  return prisma.campaign.create({
    data: {
      name: "New Customer Sip",
      description: "Encourage first-time customers to place their first order with a 10% discount.",
      status: "ACTIVE",
      audience: "NEW_CUSTOMERS",
      promotionId: promotions["SIPWELCOME"].id,
    },
  });
}

async function seedUsers(roleMap: Record<string, { id: string }>, branchId: string) {
  const passwordHash = await hashPassword(DEV_PASSWORD);

  const superAdminUser = await prisma.user.upsert({
    where: { email: "super.admin@dev.bobaking.local" },
    update: {},
    create: {
      email: "super.admin@dev.bobaking.local",
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      name: "Super Admin",
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  const branchAdminUser = await prisma.user.upsert({
    where: { email: "branch.admin@dev.bobaking.local" },
    update: {},
    create: {
      email: "branch.admin@dev.bobaking.local",
      passwordHash,
      firstName: "Branch",
      lastName: "Admin",
      name: "Branch Admin (Winneba)",
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  const frontDeskUser = await prisma.user.upsert({
    where: { email: "front.desk@dev.bobaking.local" },
    update: {},
    create: {
      email: "front.desk@dev.bobaking.local",
      passwordHash,
      firstName: "Front",
      lastName: "Desk",
      name: "Front Desk (Winneba)",
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  const kitchenStaffUser = await prisma.user.upsert({
    where: { email: "kitchen.staff@dev.bobaking.local" },
    update: {},
    create: {
      email: "kitchen.staff@dev.bobaking.local",
      passwordHash,
      firstName: "Kitchen",
      lastName: "Staff",
      name: "Kitchen Staff (Winneba)",
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  await assignRoleToUser({ userId: superAdminUser.id, roleId: roleMap[ROLES.SUPER_ADMIN].id, branchId: null });
  await assignRoleToUser({ userId: branchAdminUser.id, roleId: roleMap[ROLES.ADMIN].id, branchId });
  await assignRoleToUser({ userId: frontDeskUser.id, roleId: roleMap[ROLES.FRONT_DESK].id, branchId });
  await assignRoleToUser({
    userId: kitchenStaffUser.id,
    roleId: roleMap[ROLES.KITCHEN_STAFF].id,
    branchId,
  });

  return { superAdminUser, branchAdminUser, frontDeskUser, kitchenStaffUser };
}

async function main() {
  console.log("Seeding geography...");
  const { winneba } = await seedGeography();

  console.log("Seeding branch...");
  const branches = await seedBranches(winneba.id);
  const branch = branches[0];

  console.log("Removing retired roles...");
  await removeRetiredRole("INVENTORY_MANAGER", "inventory.manager@dev.bobaking.local");

  console.log("Seeding permission catalog...");
  const permissions = await seedPermissions();

  console.log("Seeding roles...");
  const roleMap = await seedRoles(permissions);

  console.log("Seeding development users...");
  const { superAdminUser, branchAdminUser, frontDeskUser, kitchenStaffUser } = await seedUsers(roleMap, branch.id);

  console.log("Seeding catalog (categories, products, modifiers)...");
  const { categories, products } = await seedCatalog();

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
  const rider = await seedRider(branch.id);

  console.log("Seeding customers...");
  const customers = await seedCustomers();

  console.log("Seeding promotions & campaign...");
  const promotions = await seedPromotions();
  await seedCampaign(promotions);

  console.log("\nSeed complete.");
  console.log(`Branch: ${branch.name}`);
  console.log(`Roles: ${Object.keys(roleMap).join(", ")}`);
  console.log(`Categories: ${Object.keys(categories).length}, Products: ${Object.keys(products).length}`);
  console.log(`Ingredients: ${Object.keys(ingredients).length}, Suppliers: ${suppliers.length}`);
  console.log(`Customers: ${customers.length}`);
  console.log(`Promotions: ${Object.keys(promotions).join(", ")}`);
  console.log("\nDev-only login credentials (never valid outside local/dev):");
  console.log(`  Super Admin — ${superAdminUser.email} / ${DEV_PASSWORD}`);
  console.log(`  Branch Admin (Winneba) — ${branchAdminUser.email} / ${DEV_PASSWORD}`);
  console.log(`  Front Desk (Winneba) — ${frontDeskUser.email} / ${DEV_PASSWORD}`);
  console.log(`  Kitchen Staff (Winneba) — ${kitchenStaffUser.email} / ${DEV_PASSWORD}`);
  console.log(`  Rider (Winneba) — ${rider.email} / ${DEV_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
