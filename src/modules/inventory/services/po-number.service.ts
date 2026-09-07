import { prisma } from "@/db/client";

/** Human-friendly sequential purchase order numbers (PO-1000, PO-1001, ...) — see the po_number_seq migration. */
export async function generatePoNumber(): Promise<string> {
  const [{ nextval }] = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('po_number_seq')`;
  return `PO-${nextval}`;
}
