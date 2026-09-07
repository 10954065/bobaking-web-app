import { prisma } from "@/db/client";
import {
  createIngredientSchema,
  updateIngredientSchema,
  type CreateIngredientInput,
  type UpdateIngredientInput,
} from "@/modules/inventory/schemas/ingredient.schema";

export async function listIngredients(params: { includeInactive?: boolean } = {}) {
  return prisma.ingredient.findMany({
    where: params.includeInactive ? {} : { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getIngredientById(id: string) {
  return prisma.ingredient.findUnique({ where: { id } });
}

export async function createIngredient(input: CreateIngredientInput) {
  const data = createIngredientSchema.parse(input);
  return prisma.ingredient.create({ data });
}

export async function updateIngredient(id: string, input: UpdateIngredientInput) {
  const data = updateIngredientSchema.parse(input);
  return prisma.ingredient.update({ where: { id }, data });
}

/** Ingredients are never hard-deleted — recipes and stock history must keep referencing them. Hiding one only flips isActive. */
export async function deactivateIngredient(id: string) {
  return prisma.ingredient.update({ where: { id }, data: { isActive: false } });
}
