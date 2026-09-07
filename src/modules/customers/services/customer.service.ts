import { prisma } from "@/db/client";
import {
  createCustomerSchema,
  updateCustomerSchema,
  createCustomerAddressSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type CreateCustomerAddressInput,
} from "@/modules/customers/schemas/customer.schema";

/** Case-insensitive match across name/email/phone — the POS "customer lookup" search. */
export async function searchCustomers(query: string, limit = 20) {
  if (!query.trim()) return [];
  return prisma.customer.findMany({
    where: {
      deletedAt: null,
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
      ],
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });
}

export async function getCustomerById(id: string) {
  return prisma.customer.findFirst({
    where: { id, deletedAt: null },
    include: { addresses: { orderBy: { isDefault: "desc" } } },
  });
}

/** Staff-created walk-in customers stay GUEST (no password, no login) until the customer sets one up themselves. */
export async function createCustomer(input: CreateCustomerInput) {
  const data = createCustomerSchema.parse(input);
  return prisma.customer.create({
    data: {
      email: data.email,
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      status: "GUEST",
    },
  });
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  const data = updateCustomerSchema.parse(input);
  return prisma.customer.update({ where: { id }, data });
}

/** Customers are never hard-deleted — order/payment history must keep referencing them. */
export async function deactivateCustomer(id: string) {
  return prisma.customer.update({ where: { id }, data: { deletedAt: new Date(), status: "SUSPENDED" } });
}

export async function addCustomerAddress(customerId: string, input: CreateCustomerAddressInput) {
  const data = createCustomerAddressSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.customerAddress.updateMany({ where: { customerId }, data: { isDefault: false } });
    }
    return tx.customerAddress.create({ data: { ...data, customerId } });
  });
}

export async function listCustomerAddresses(customerId: string) {
  return prisma.customerAddress.findMany({
    where: { customerId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}
