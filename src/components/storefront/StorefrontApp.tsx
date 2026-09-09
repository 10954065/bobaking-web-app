"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ChevronUp, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { ModifierModal, type ModifierSelection } from "@/components/pos/ModifierModal";
import { MenuImage } from "@/components/menu/MenuImage";
import { Logo } from "@/components/brand/Logo";
import { SplashVisual, EXIT_BLOOM_COVER_MS, useReducedMotionPreference, type SplashEntranceTimings } from "@/components/brand/SplashVisual";
import { BranchStep } from "@/components/storefront/BranchStep";
import { CheckoutStep, type GuestCheckoutValues } from "@/components/storefront/CheckoutStep";
import { PhoneAuthStep } from "@/components/storefront/PhoneAuthStep";
import { PaymentStep } from "@/components/storefront/PaymentStep";
import {
  getStorefrontMenuAction,
  placeStorefrontOrderAction,
  type StorefrontBranch,
  type StorefrontMenu,
  type StorefrontOrderSummary,
} from "@/modules/storefront/actions/storefront.actions";
import { signOutCustomerAction } from "@/modules/customer-auth/actions/customer-auth.actions";
import type { CurrentCustomer } from "@/modules/customer-auth/services/current-customer.service";
import { addSelectionToCart, type LocalCartItem } from "@/modules/storefront/lib/storefront-cart";
import type { PosProduct } from "@/modules/pos/services/pos-catalog.service";

type Step = "branch" | "menu" | "phone" | "checkout" | "payment";

// A compressed replay of the homepage splash's entrance, used as a brand
// beat at two hand-off points — branch -> menu (real async wait) and menu ->
// checkout (purely decorative) — same choreography, much shorter hold.
const QUICK_TRANSITION_TIMINGS: SplashEntranceTimings = {
  flood: 0,
  wordmark: 100,
  ampersand: 560,
  dropletBase: 760,
  dropletStagger: 60,
  glow: 980,
  tagline: 1060,
};
// How long the entrance needs to play before it's OK to exit — a fixed hold
// for checkout (nothing to wait on), a minimum for menu loading (the real
// fetch can run longer, in which case the glow's idle breathing loop covers
// the wait — see globals.css .splash-glow).
const QUICK_TRANSITION_HOLD_MS = 1450;

// A customer who has already added items and then loses this component
// (an accidental back-swipe, a refresh, tab close/reopen) should never come
// back to an empty cart — mirrored to sessionStorage on every change, and
// used to resume exactly where they left off on mount. Session-scoped
// rather than localStorage: a cart shouldn't resurface days later against
// stale prices.
const CART_STORAGE_KEY = "flicks-cart-v1";

type PersistedCartState = {
  branchId: string;
  type: "DELIVERY" | "PICKUP";
  cart: LocalCartItem[];
};

export function StorefrontApp({
  branches,
  initialDishId = null,
  cardPaymentsEnabled = false,
  initialCustomer = null,
}: {
  branches: StorefrontBranch[];
  initialDishId?: string | null;
  cardPaymentsEnabled?: boolean;
  /** The already-verified customer for this browser, if any — see OrderPage. Lets a returning customer skip phone/OTP entirely. */
  initialCustomer?: CurrentCustomer | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("branch");
  const [customer, setCustomer] = useState<CurrentCustomer | null>(initialCustomer);
  const [type, setType] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [branchId, setBranchId] = useState<string | null>(null);
  const [menu, setMenu] = useState<StorefrontMenu | null>(null);
  const [isMenuLoading, setMenuLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PosProduct | null>(null);
  const [cart, setCart] = useState<LocalCartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [order, setOrder] = useState<StorefrontOrderSummary | null>(null);
  const [checkoutTransition, setCheckoutTransition] = useState(false);
  const reducedMotion = useReducedMotionPreference();
  const transitionTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => transitionTimers.current.forEach(clearTimeout);
  }, []);

  // Steps live in component state, not the URL, so without this the browser
  // has no history entries for them — back/swipe-back would skip the whole
  // flow and land wherever the visitor was before /order. goToStep pushes a
  // real Next.js history entry per forward step (via the router, not raw
  // history.pushState — Next's own router listens for popstate and expects
  // entries it created; anything else gets treated as a stale cache miss and
  // forces a full reload, which was tried and wiped all component state).
  // This effect is what makes back/swipe actually change the visible step:
  // it fires whenever the router resolves a popstate-driven navigation.
  // Payment is intentionally never reflected here — see handlePlaceOrder.
  useEffect(() => {
    const urlStep = searchParams.get("step");
    if (urlStep === "menu" || urlStep === "checkout" || urlStep === "phone") {
      setStep(urlStep);
    } else if (!urlStep) {
      setStep((current) => (current === "payment" ? current : "branch"));
    }
  }, [searchParams]);

  function goToStep(next: "menu" | "checkout" | "phone") {
    router.push(`${pathname}?step=${next}`, { scroll: false });
    setStep(next);
  }

  function goBack() {
    router.back();
  }

  /** Skips straight to checkout for an already-verified customer — "log in once, just buy". */
  function handleCheckoutClick() {
    if (reducedMotion) {
      goToStep(customer ? "checkout" : "phone");
      return;
    }
    setCheckoutTransition(true);
    transitionTimers.current.push(
      setTimeout(() => setCheckoutTransition(false), QUICK_TRANSITION_HOLD_MS),
      setTimeout(() => goToStep(customer ? "checkout" : "phone"), QUICK_TRANSITION_HOLD_MS + EXIT_BLOOM_COVER_MS)
    );
  }

  function handleVerified(verified: CurrentCustomer) {
    setCustomer(verified);
    goToStep("checkout");
  }

  function handleChangeNumber() {
    setCustomer(null);
    signOutCustomerAction().catch(() => {});
    goToStep("phone");
  }

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.lineTotal, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const currentBranch = branches.find((b) => b.id === branchId);

  async function handleBranchContinue(id: string, options: { skipInitialDish?: boolean } = {}) {
    setBranchError(null);
    setBranchId(id);
    setMenuLoading(true);
    const startedAt = performance.now();

    let loaded: StorefrontMenu;
    try {
      loaded = await getStorefrontMenuAction(id);
    } catch (e) {
      setMenuLoading(false);
      setBranchError(e instanceof Error ? e.message : "Couldn't load the menu right now. Please try again.");
      return;
    }

    const revealMenu = () => {
      setMenu(loaded);
      goToStep("menu");
      // Came from tapping a dish on the homepage — jump straight into
      // ordering that item instead of making them find it again in the grid.
      // Skipped when resuming a restored cart — that intent takes priority.
      if (initialDishId && !options.skipInitialDish) {
        const match = loaded.products.find((p) => p.id === initialDishId);
        if (match) setSelectedProduct(match);
      }
    };

    if (reducedMotion) {
      setMenuLoading(false);
      revealMenu();
      return;
    }

    // Never cut the entrance short if the fetch was fast — but never make a
    // slow fetch wait either, the glow's idle breathing loop covers it.
    const holdRemaining = Math.max(0, QUICK_TRANSITION_HOLD_MS - (performance.now() - startedAt));
    transitionTimers.current.push(
      setTimeout(() => {
        setMenuLoading(false);
        transitionTimers.current.push(setTimeout(revealMenu, EXIT_BLOOM_COVER_MS));
      }, holdRemaining)
    );
  }

  // Restore a cart that survived losing this component — re-fetches the
  // branch's menu and replays the normal loading transition, landing back
  // on the menu step with the cart already in place. setCart/setType here
  // only queue state updates; they land on a later render, not this effect
  // pass — see isFirstPersistRun below, which is what keeps the persistence
  // effect from seeing this render's still-empty state and wiping the
  // sessionStorage entry before that restored state actually lands.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PersistedCartState>;
        if (saved.branchId && saved.cart?.length) {
          setCart(saved.cart);
          setType(saved.type === "PICKUP" ? "PICKUP" : "DELIVERY");
          handleBranchContinue(saved.branchId, { skipInitialDish: true });
        }
      }
    } catch {
      // Corrupt or old-shape data — ignore and start fresh.
    }
    // Intentionally mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror the cart to sessionStorage on every change. Skips its first run
  // unconditionally: on mount that run either has nothing to persist yet, or
  // a restore (above) is in flight and will show up as a second run once its
  // setCart/setBranchId land — never as this initial, still-empty one.
  const isFirstPersistRun = useRef(true);
  useEffect(() => {
    if (isFirstPersistRun.current) {
      isFirstPersistRun.current = false;
      return;
    }
    if (!branchId || cart.length === 0) {
      sessionStorage.removeItem(CART_STORAGE_KEY);
      return;
    }
    const payload: PersistedCartState = { branchId, type, cart };
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
  }, [cart, branchId, type]);

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
      setCart([]);
      setCartOpen(false);
      // Not pushed to history: the order already exists, so back-navigating
      // into a resubmittable checkout form here would risk a duplicate
      // order. Back from payment lands on menu (checkout's own entry) instead.
      setStep("payment");
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Couldn't place your order, please try again.");
    } finally {
      setIsPlacing(false);
    }
  }

  if (step === "branch") {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100">
        <SplashVisual visible={isMenuLoading} reducedMotion={reducedMotion} timings={QUICK_TRANSITION_TIMINGS} tagline="Finding your menu" />
        <BranchStep branches={branches} type={type} error={branchError} onSelectType={setType} onContinue={handleBranchContinue} />
      </div>
    );
  }

  if (step === "payment" && order) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100">
        <PaymentStep order={order} cardPaymentsEnabled={cardPaymentsEnabled} onDone={() => router.push(`/track/${order.trackingToken}`)} />
      </div>
    );
  }

  // Also covers landing on "checkout" without a session (e.g. a stale/expired
  // one from before this component mounted, or direct back/forward into the
  // URL) — never render the checkout form without a verified customer behind it.
  if (step === "phone" || (step === "checkout" && !customer)) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100">
        <PhoneAuthStep onVerified={handleVerified} onBack={goBack} />
      </div>
    );
  }

  if (step === "checkout" && customer) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100">
        <CheckoutStep
          type={type}
          verifiedPhone={customer.phone}
          initialFirstName={customer.firstName}
          initialLastName={customer.lastName}
          initialEmail={customer.email ?? ""}
          cart={cart}
          cartTotal={cartTotal}
          isPending={isPlacing}
          error={checkoutError}
          onBack={goBack}
          onChangeNumber={handleChangeNumber}
          onSubmit={handlePlaceOrder}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-950 text-stone-100">
      <SplashVisual visible={checkoutTransition} reducedMotion={false} timings={QUICK_TRANSITION_TIMINGS} tagline="Almost there" />

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-stone-800 bg-stone-950/95 px-4 py-3 backdrop-blur">
        <button
          onClick={goBack}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-100"
        >
          <ArrowLeft size={17} />
        </button>
        <Logo size={36} ring={false} />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-cyan">
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
                          <p className="text-xs font-semibold text-brand-red-light">GHS {item.lineTotal.toFixed(2)}</p>
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
                <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-red text-white">
                  <ShoppingBag size={16} />
                  <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-stone-950 text-[10px] font-bold text-brand-cyan ring-2 ring-stone-900">
                    {cartCount}
                  </span>
                </span>
                <span className="text-sm font-semibold text-stone-100">
                  GHS {cartTotal.toFixed(2)} <ChevronUp size={12} className="inline text-stone-500" />
                </span>
              </button>
              <button
                onClick={handleCheckoutClick}
                className="rounded-xl bg-brand-red px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-red/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"
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
