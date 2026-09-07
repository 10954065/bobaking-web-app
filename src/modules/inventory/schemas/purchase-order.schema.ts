import { z } from "zod";

export const createPurchaseOrderSchema = z.object({
  branchId: z.string().uuid(),
  supplierId: z.string().uuid(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        ingredientId: z.string().uuid(),
        quantityOrdered: z.number().positive(),
        unitCost: z.number().nonnegative(),
      })
    )
    .min(1, "A purchase order needs at least one line item"),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

export const receivePurchaseOrderItemsSchema = z.object({
  items: z.array(
    z.object({
      purchaseOrderItemId: z.string().uuid(),
      quantityReceived: z.number().nonnegative(),
    })
  ),
});

export type ReceivePurchaseOrderItemsInput = z.infer<typeof receivePurchaseOrderItemsSchema>;
