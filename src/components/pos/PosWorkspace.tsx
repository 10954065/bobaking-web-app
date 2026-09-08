"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UtensilsCrossed, ChevronDown, UserRound, LogOut } from "lucide-react";
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
import { signOutAction } from "@/modules/auth/actions/sign-out.action";
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
          branchId={branchId}
          customerId={customer.id}
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
    <header className="flex items-center justify-between border-b border-stone-800 px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white">
          <UtensilsCrossed size={17} strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-500">Flicks &amp; Licks</p>
          <h1 className="truncate text-lg font-semibold text-stone-50">POS — {branchName}</h1>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {branches.length > 1 && (
          <div className="relative">
            <select
              defaultValue={branchId}
              onChange={(e) => router.push(`/pos?branch=${e.target.value}`)}
              className="appearance-none rounded-lg border border-stone-700 bg-stone-900 py-2 pl-3 pr-8 text-sm text-stone-100"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500" />
          </div>
        )}
        <Link
          href="/account"
          title="My account"
          className="flex size-9 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-100"
        >
          <UserRound size={17} />
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            title="Sign out"
            className="flex size-9 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-red-950/50 hover:text-red-400"
          >
            <LogOut size={17} />
          </button>
        </form>
      </div>
    </header>
  );
}
