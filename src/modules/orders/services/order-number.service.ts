import { prisma } from "@/db/client";

/** Human-friendly sequential order numbers (FL-1000, FL-1001, ...) — see the order_number_seq migration. */
export async function generateOrderNumber(): Promise<string> {
  const [{ nextval }] = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('order_number_seq')`;
  return `FL-${nextval}`;
}
