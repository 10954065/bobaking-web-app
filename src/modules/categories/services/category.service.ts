import { prisma } from "@/db/client";
import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/modules/categories/schemas/category.schema";

export async function listCategories(params: { includeInactive?: boolean } = {}) {
  return prisma.category.findMany({
    where: params.includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({ where: { slug } });
}

export async function createCategory(input: CreateCategoryInput) {
  const data = createCategorySchema.parse(input);
  return prisma.category.create({ data });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const data = updateCategorySchema.parse(input);
  return prisma.category.update({ where: { id }, data });
}

/** Categories are never hard-deleted — hiding one only flips isActive, which also hides its products from customer-facing listings. */
export async function deactivateCategory(id: string) {
  return prisma.category.update({ where: { id }, data: { isActive: false } });
}
