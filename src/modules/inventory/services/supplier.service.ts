import { prisma } from "@/db/client";
import {
  createSupplierSchema,
  updateSupplierSchema,
  type CreateSupplierInput,
  type UpdateSupplierInput,
} from "@/modules/inventory/schemas/supplier.schema";

export async function listSuppliers(params: { includeInactive?: boolean } = {}) {
  return prisma.supplier.findMany({
    where: params.includeInactive ? {} : { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getSupplierById(id: string) {
  return prisma.supplier.findUnique({ where: { id } });
}

export async function createSupplier(input: CreateSupplierInput) {
  const data = createSupplierSchema.parse(input);
  return prisma.supplier.create({
    data: { ...data, email: data.email === "" ? undefined : data.email },
  });
}

export async function updateSupplier(id: string, input: UpdateSupplierInput) {
  const data = updateSupplierSchema.parse(input);
  return prisma.supplier.update({
    where: { id },
    data: { ...data, email: data.email === "" ? null : data.email },
  });
}

/** Suppliers are never hard-deleted — purchase order history must keep referencing them. Hiding one only flips isActive. */
export async function deactivateSupplier(id: string) {
  return prisma.supplier.update({ where: { id }, data: { isActive: false } });
}
