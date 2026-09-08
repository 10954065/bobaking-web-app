import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Real catalog, migrated from the official ordering site
// (take.app/flicksnlicks) at the business owner's direction — replaces the
// placeholder demo menu from prisma/seed.ts with actual products, prices,
// descriptions, and photos.

const UPDATED_IN_PLACE = [
  { slug: "chicken-suya", basePrice: 60, imageUrl: "/images/menu/chicken-suya.jpg" },
  { slug: "cheesy-shawarma", basePrice: 120, imageUrl: "/images/menu/cheesy-shawarma.jpg" },
  { slug: "fresh-juice", basePrice: 40, imageUrl: "/images/menu/fresh-juice.jpeg" },
];

const NEW_PRODUCTS = [
  {
    name: "Fried Rice",
    slug: "real-fried-rice",
    category: "rice",
    basePrice: 40,
    imageUrl: "/images/menu/fried-rice.jpg",
    station: "rice",
  },
  {
    name: "Assorted Jollof",
    slug: "assorted-jollof",
    category: "rice",
    basePrice: 120,
    imageUrl: "/images/menu/assorted-jollof.png",
    description: "Jollof rice stir-fried with spicy chicken suya and sausage.",
    station: "rice",
  },
  {
    name: "Loaded Fries with Cheese",
    slug: "loaded-fries-with-cheese",
    category: "fries",
    basePrice: 135,
    imageUrl: "/images/menu/loaded-fries-cheese.jpg",
    station: "fries",
  },
  {
    name: "Super Loaded (Plantain+)",
    slug: "super-loaded-plantain",
    category: "fries",
    basePrice: 170,
    imageUrl: "/images/menu/super-loaded-plantain.jpg",
    description: "Includes everything in loaded fries with an extra quantity of constituents, plus kelewele.",
    station: "fries",
  },
  {
    name: "Fully Loaded Shawarma",
    slug: "fully-loaded-shawarma",
    category: "wraps",
    basePrice: 95,
    imageUrl: "/images/menu/fully-loaded-shawarma.jpg",
    station: "shawarma",
  },
  {
    name: "Flicks Special Pizza",
    slug: "flicks-special-pizza",
    category: "pizzas",
    basePrice: 140,
    imageUrl: "/images/menu/flicks-special-pizza.jpg",
    station: "pizza",
  },
  {
    name: "Flicks & Licks Combo",
    slug: "flicks-and-licks-combo",
    category: "suyas",
    basePrice: 290,
    imageUrl: "/images/menu/flicks-licks-combo.jpg",
    description: "Combo of chicken suya, beef suya, spicy chicken wings, spring rolls, french fries, pizza slides, fried rice and jollof rice.",
    station: "packing",
  },
];

// Superseded by a real product above — kept (not deleted, existing orders
// reference them) but hidden from ordering going forward.
const DEACTIVATED_SLUGS = [
  "loaded-fries",
  "classic-fries",
  "beef-suya",
  "jollof-rice-chicken",
  "fried-rice-beef",
  "chicken-shawarma",
  "pepperoni-pizza-medium",
  "chicken-pizza-medium",
  "flicks-combo",
];

async function main() {
  for (const item of UPDATED_IN_PLACE) {
    const { slug, ...data } = item;
    const updated = await prisma.product.updateMany({ where: { slug }, data });
    console.log(`updated ${slug}: ${updated.count} row(s)`);
  }

  for (const item of NEW_PRODUCTS) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: item.category } });
    const existing = await prisma.product.findUnique({ where: { slug: item.slug } });
    if (existing) {
      await prisma.product.update({
        where: { slug: item.slug },
        data: {
          name: item.name,
          categoryId: category.id,
          basePrice: item.basePrice,
          imageUrl: item.imageUrl,
          description: item.description ?? null,
          stationSlug: item.station,
          isActive: true,
        },
      });
      console.log(`re-activated ${item.slug}`);
    } else {
      await prisma.product.create({
        data: {
          name: item.name,
          slug: item.slug,
          categoryId: category.id,
          basePrice: item.basePrice,
          imageUrl: item.imageUrl,
          description: item.description ?? null,
          stationSlug: item.station,
        },
      });
      console.log(`created ${item.slug}`);
    }
  }

  const deactivated = await prisma.product.updateMany({
    where: { slug: { in: DEACTIVATED_SLUGS } },
    data: { isActive: false },
  });
  console.log(`deactivated ${deactivated.count} superseded placeholder product(s)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
