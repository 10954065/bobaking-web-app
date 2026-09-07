"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CustomerPanel, type PosCustomer } from "@/components/pos/CustomerPanel";
import { DeliveryAddressPanel } from "@/components/pos/DeliveryAddressPanel";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { ModifierModal, type ModifierSelection } from "@/components/pos/ModifierModal";
import { CartPanel } from "@/components/pos/CartPanel";
import { CheckoutFlow } from "@/components/pos/CheckoutFlow";
import {
  getOrCreateCartAction,
  addItemToCartAction,
  updateCartItemQuantityAction,
  removeCartItemAction,
} from "@/modules/pos/actions/pos.actions";
import type { PosProduct, PosCart } from "@/modules/pos/services/pos-catalog.service";

interface Category {
  id: string;
  name: string;
}

export function PosWorkspace({
  branchId,
  branchName,
  branches,
  categories,
  products,
}: {
  branchId: string;
  branchName: string;
  branches: { id: string; name: string }[];
  categories: Category[];
  products: PosProduct[];
}) {
  const router = useRouter();
  const [customer, setCustomer] = useState<PosCustomer | null>(null);
  const [cart, setCart] = useState<PosCart | null>(null);
  const [deliveryAddressId, setDeliveryAddressId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<PosProduct | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  async function handleStartOrder(selectedCustomer: PosCustomer, type: "DELIVERY" | "PICKUP" | "DINE_IN") {
    setCustomer(selectedCustomer);
    const newCart = await getOrCreateCartAction({ branchId, customerId: selectedCustomer.id, type });
    setCart(newCart);
  }

  async function handleAddItem(selection: ModifierSelection) {
    if (!cart) return;
    setIsBusy(true);
    try {
      const updated = await addItemToCartAction(cart.id, selection);
      setCart(updated);
      setSelectedProduct(null);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleIncrement(cartItemId: string, quantity: number) {
    if (!cart) return;
    const updated = await updateCartItemQuantityAction(cart.id, cartItemId, quantity + 1);
    setCart(updated);
  }

  async function handleDecrement(cartItemId: string, quantity: number) {
    if (!cart) return;
    if (quantity <= 1) return handleRemove(cartItemId);
    const updated = await updateCartItemQuantityAction(cart.id, cartItemId, quantity - 1);
    setCart(updated);
  }

  async function handleRemove(cartItemId: string) {
    if (!cart) return;
    const updated = await removeCartItemAction(cart.id, cartItemId);
    setCart(updated);
  }

  function handleOrderComplete() {
    setCheckoutOpen(false);
    setCustomer(null);
    setCart(null);
    setDeliveryAddressId(null);
  }

  if (!customer || !cart) {
    return (
      <div className="min-h-screen bg-stone-950">
        <PosHeader branchName={branchName} branches={branches} branchId={branchId} router={router} />
        <CustomerPanel onStart={handleStartOrder} />
      </div>
    );
  }

  if (cart.type === "DELIVERY" && !deliveryAddressId) {
    return (
      <div className="min-h-screen bg-stone-950">
        <PosHeader branchName={branchName} branches={branches} branchId={branchId} router={router} />
        <DeliveryAddressPanel
          customerId={customer.id}
          customerName={`${customer.firstName} ${customer.lastName}`}
          onSelect={setDeliveryAddressId}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-stone-950">
      <PosHeader branchName={branchName} branches={branches} branchId={branchId} router={router} />
      <div className="grid flex-1 grid-cols-[1fr_360px] overflow-hidden">
        <ProductGrid categories={categories} products={products} onSelectProduct={setSelectedProduct} />
        <CartPanel
          cart={cart}
          customer={customer}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onRemove={handleRemove}
          onCheckout={() => setCheckoutOpen(true)}
          isBusy={isBusy}
        />
      </div>

      {selectedProduct && (
        <ModifierModal product={selectedProduct} onCancel={() => setSelectedProduct(null)} onConfirm={handleAddItem} />
      )}

      {checkoutOpen && (
        <CheckoutFlow
          cartId={cart.id}
          subtotal={cart.subtotal}
          deliveryAddressId={deliveryAddressId ?? undefined}
          onClose={() => setCheckoutOpen(false)}
          onOrderComplete={handleOrderComplete}
        />
      )}
    </div>
  );
}

function PosHeader({
  branchName,
  branches,
  branchId,
  router,
}: {
  branchName: string;
  branches: { id: string; name: string }[];
  branchId: string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <header className="flex items-center justify-between border-b border-stone-800 px-6 py-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">Flicks &amp; Licks</p>
        <h1 className="text-lg font-semibold text-stone-50">POS — {branchName}</h1>
      </div>
      {branches.length > 1 && (
        <select
          defaultValue={branchId}
          onChange={(e) => router.push(`/pos?branch=${e.target.value}`)}
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      )}
    </header>
  );
}
