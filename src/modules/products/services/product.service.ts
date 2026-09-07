import { prisma } from "@/db/client";
import type { Prisma } from "@prisma/client";
import {
  createProductSchema,
  updateProductSchema,
  branchOverrideSchema,
  type CreateProductInput,
  type UpdateProductInput,
  type BranchOverrideInput,
} from "@/modules/products/schemas/product.schema";

export interface ResolvedProduct {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: Prisma.Decimal;
  price: Prisma.Decimal;
  isAvailable: boolean;
}

function resolveForBranch(
  product: {
    id: string;
    categoryId: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    basePrice: Prisma.Decimal;
    isActive: boolean;
  },
  override: { price: Prisma.Decimal | null; isAvailable: boolean } | undefined
): ResolvedProduct {
  return {
    id: product.id,
    categoryId: product.categoryId,
    name: product.name,
    slug: product.slug,
    description: product.description,
    imageUrl: product.imageUrl,
    basePrice: product.basePrice,
    price: override?.price ?? product.basePrice,
    isAvailable: product.isActive && (override?.isAvailable ?? true),
  };
}

/** Global catalog listing (admin view) — not branch-resolved. */
export async function listProducts(params: { categoryId?: string; includeInactive?: boolean } = {}) {
  return prisma.product.findMany({
    where: {
      categoryId: params.categoryId,
      ...(params.includeInactive ? {} : { isActive: true }),
    },
    include: { category: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({ where: { id }, include: { category: true } });
}

/** What this branch actually sells right now — merges the global product with its branch-specific price/availability override. */
export async function listProductsForBranch(
  branchId: string,
  params: { categoryId?: string } = {}
): Promise<ResolvedProduct[]> {
  const products = await prisma.product.findMany({
    where: { categoryId: params.categoryId, isActive: true },
    include: { branchOverrides: { where: { branchId } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return products.map((product) => resolveForBranch(product, product.branchOverrides[0]));
}

export async function getProductForBranch(productId: string, branchId: string): Promise<ResolvedProduct | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { branchOverrides: { where: { branchId } } },
  });
  if (!product) return null;
  return resolveForBranch(product, product.branchOverrides[0]);
}

export async function createProduct(input: CreateProductInput) {
  const data = createProductSchema.parse(input);
  return prisma.product.create({ data });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const data = updateProductSchema.parse(input);
  return prisma.product.update({ where: { id }, data });
}

/** Products are never hard-deleted — order history must keep referencing them. Hiding one only flips isActive. */
export async function deactivateProduct(id: string) {
  return prisma.product.update({ where: { id }, data: { isActive: false } });
}

export async function setBranchOverride(productId: string, branchId: string, input: BranchOverrideInput) {
  const data = branchOverrideSchema.parse(input);
  return prisma.productBranchOverride.upsert({
    where: { productId_branchId: { productId, branchId } },
    create: {
      productId,
      branchId,
      price: data.price ?? null,
      isAvailable: data.isAvailable ?? true,
    },
    update: {
      ...(data.price !== undefined ? { price: data.price } : {}),
      ...(data.isAvailable !== undefined ? { isAvailable: data.isAvailable } : {}),
    },
  });
}
