import { prisma } from "@/db/client";
import {
  createModifierGroupSchema,
  createModifierOptionSchema,
  type CreateModifierGroupInput,
  type CreateModifierOptionInput,
} from "@/modules/modifiers/schemas/modifier.schema";

export async function createModifierGroup(input: CreateModifierGroupInput) {
  const data = createModifierGroupSchema.parse(input);
  return prisma.modifierGroup.create({ data });
}

export async function addModifierOption(input: CreateModifierOptionInput) {
  const data = createModifierOptionSchema.parse(input);
  return prisma.modifierOption.create({ data });
}

export async function attachModifierGroupToProduct(productId: string, modifierGroupId: string, sortOrder = 0) {
  return prisma.productModifierGroup.upsert({
    where: { productId_modifierGroupId: { productId, modifierGroupId } },
    create: { productId, modifierGroupId, sortOrder },
    update: { sortOrder },
  });
}

export async function detachModifierGroupFromProduct(productId: string, modifierGroupId: string) {
  await prisma.productModifierGroup.deleteMany({ where: { productId, modifierGroupId } });
}

/** Modifier groups + their active options, for a single product, in display order. */
export async function listModifierGroupsForProduct(productId: string) {
  const links = await prisma.productModifierGroup.findMany({
    where: { productId },
    orderBy: { sortOrder: "asc" },
    include: {
      modifierGroup: {
        include: {
          options: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
  return links.map((link) => link.modifierGroup);
}
