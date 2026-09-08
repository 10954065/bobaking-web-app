"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ChevronUp, Minus, Plus, ShoppingBag, Trash2, UtensilsCrossed, X } from "lucide-react";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { ModifierModal, type ModifierSelection } from "@/components/pos/ModifierModal";
import { MenuImage } from "@/components/menu/MenuImage";
import { BranchStep } from "@/components/storefront/BranchStep";
import { CheckoutStep, type GuestCheckoutValues } from "@/components/storefront/CheckoutStep";
import { PaymentStep } from "@/components/storefront/PaymentStep";
import {
  getStorefrontMenuAction,
  placeStorefrontOrderAction,
  type StorefrontBranch,
  type StorefrontMenu,
  type StorefrontOrderSummary,
} from "@/modules/storefront/actions/storefront.actions";
import { addSelectionToCart, type LocalCartItem } from "@/modules/storefront/lib/storefront-cart";
import type { PosProduct } from "@/modules/pos/services/pos-catalog.service";

type Step = "branch" | "menu" | "checkout" | "payment";

export function StorefrontApp({ branches }: { branches: StorefrontBranch[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("branch");
  const [type, setType] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [branchId, setBranchId] = useState<string | null>(null);
  const [menu, setMenu] = useState<StorefrontMenu | null>(null);
  const [isMenuLoading, setMenuLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PosProduct | null>(null);
  const [cart, setCart] = useState<LocalCartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [order, setOrder] = useState<StorefrontOrderSummary | null>(null);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.lineTotal, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const currentBranch = branches.find((b) => b.id === branchId);

  async function handleBranchContinue(id: string) {
    setBranchId(id);
    setMenuLoading(true);
    try {
      const loaded = await getStorefrontMenuAction(id);
      setMenu(loaded);
      setStep("menu");
    } finally {
      setMenuLoading(false);
    }
  }

  function handleConfirmItem(selection: ModifierSelection) {
    if (!selectedProduct) return;
    setCart((prev) => addSelectionToCart(prev, selectedProduct, selection));
    setSelectedProduct(null);
    setCartOpen(true);
  }

  function updateQuantity(key: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.key !== key));
      return;
    }
    setCart((prev) => prev.map((item) => (item.key === key ? { ...item, quantity, lineTotal: item.unitPrice * quantity } : item)));
  }

  async function handlePlaceOrder(guest: GuestCheckoutValues, coords: { latitude: number; longitude: number } | null) {
    if (!branchId) return;
    setCheckoutError(null);
    setIsPlacing(true);
    try {
      const placed = await placeStorefrontOrderAction({
        branchId,
        type,
        guest: {
          firstName: guest.firstName.trim(),
          lastName: guest.lastName.trim(),
          phone: guest.phone.trim(),
          email: guest.email.trim() || undefined,
        },
        deliveryAddress:
          type === "DELIVERY"
            ? {
                addressLine1: guest.addressLine1.trim(),
                area: guest.area.trim() || undefined,
                landmark: guest.landmark.trim() || undefined,
                latitude: coords?.latitude,
                longitude: coords?.longitude,
              }
            : undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes || undefined,
          modifierOptionIds: item.modifierOptionIds,
        })),
      });
      setOrder(placed);
      setCartOpen(false);
      setStep("payment");
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Couldn't place your order — please try again.");
    } finally {
      setIsPlacing(false);
    }
  }

  if (step === "branch") {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100">
        {isMenuLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <p className="text-sm text-stone-300">Loading menu…</p>
          </div>
        )}
        <BranchStep branches={branches} type={type} onSelectType={setType} onContinue={handleBranchContinue} />
      </div>
    );
  }

  if (step === "payment" && order) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100">
        <PaymentStep order={order} onDone={() => router.push(`/track/${order.orderNumber}`)} />
      </div>
    );
  }

  if (step === "checkout") {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100">
        <CheckoutStep
          type={type}
          cartTotal={cartTotal}
          isPending={isPlacing}
          error={checkoutError}
          onBack={() => setStep("menu")}
          onSubmit={handlePlaceOrder}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-950 text-stone-100">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-stone-800 bg-stone-950/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => setStep("branch")}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-100"
        >
          <ArrowLeft size={17} />
        </button>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white">
          <UtensilsCrossed size={17} strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-500">
            {type === "DELIVERY" ? "Delivery" : "Pickup"}
          </p>
          <h1 className="truncate text-base font-semibold leading-tight">{currentBranch?.name}</h1>
        </div>
      </header>

      <div className="flex-1 pb-24">{menu && <ProductGrid categories={menu.categories} products={menu.products} onSelectProduct={setSelectedProduct} />}</div>

      {selectedProduct && (
        <ModifierModal product={selectedProduct} onCancel={() => setSelectedProduct(null)} onConfirm={handleConfirmItem} />
      )}

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4">
          <div className="mx-auto max-w-lg">
            <AnimatePresence>
              {cartOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.2 }}
                  className="mb-3 max-h-[50vh] overflow-y-auto rounded-2xl border border-stone-800 bg-stone-900 p-3 shadow-2xl"
                >
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-sm font-semibold text-stone-200">Your order</p>
                    <button onClick={() => setCartOpen(false)} className="rounded-lg p-1 text-stone-500 hover:text-stone-200">
                      <X size={16} />
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {cart.map((item) => (
                      <li key={item.key} className="flex items-center gap-2.5 rounded-xl bg-stone-800/50 p-2">
                        <MenuImage src={item.imageUrl} alt={item.productName} className="size-12 shrink-0 rounded-lg" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-stone-100">{item.productName}</p>
                          {item.modifiersLabel && <p className="truncate text-xs text-stone-500">{item.modifiersLabel}</p>}
                          <p className="text-xs font-semibold text-orange-500">GHS {item.lineTotal.toFixed(2)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            onClick={() => updateQuantity(item.key, item.quantity - 1)}
                            className="flex size-7 items-center justify-center rounded-lg bg-stone-700 text-stone-100 hover:bg-stone-600"
                          >
                            {item.quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                          </button>
                          <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.key, item.quantity + 1)}
                            className="flex size-7 items-center justify-center rounded-lg bg-stone-700 text-stone-100 hover:bg-stone-600"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 rounded-2xl border border-stone-800 bg-stone-900 p-2 shadow-2xl">
              <button
                onClick={() => setCartOpen((v) => !v)}
                className="flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-stone-800"
              >
                <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-white">
                  <ShoppingBag size={16} />
                  <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-stone-950 text-[10px] font-bold text-orange-400 ring-2 ring-stone-900">
                    {cartCount}
                  </span>
                </span>
                <span className="text-sm font-semibold text-stone-100">
                  GHS {cartTotal.toFixed(2)} <ChevronUp size={12} className="inline text-stone-500" />
                </span>
              </button>
              <button
                onClick={() => setStep("checkout")}
                className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
              >
                Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
