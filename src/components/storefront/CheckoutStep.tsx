"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Flag, Home, Mail, MapPin, ReceiptText, ShieldCheck, User } from "lucide-react";
import { MenuImage } from "@/components/menu/MenuImage";
import { storefrontInputClass } from "@/components/storefront/input-styles";
import type { LocalCartItem } from "@/modules/storefront/lib/storefront-cart";

export interface GuestCheckoutValues {
  firstName: string;
  lastName: string;
  email: string;
  addressLine1: string;
  area: string;
  landmark: string;
}

function IconField({
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: LucideIcon }) {
  return (
    <div className="relative flex-1">
      <Icon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
      <input {...props} className={storefrontInputClass} />
    </div>
  );
}

export function CheckoutStep({
  type,
  verifiedPhone,
  initialFirstName = "",
  initialLastName = "",
  initialEmail = "",
  cart,
  cartTotal,
  isPending,
  error,
  onBack,
  onChangeNumber,
  onSubmit,
}: {
  type: "DELIVERY" | "PICKUP";
  /** The OTP-verified phone this order will be placed under — display-only, see PhoneAuthStep. */
  verifiedPhone: string;
  initialFirstName?: string;
  initialLastName?: string;
  initialEmail?: string;
  cart: LocalCartItem[];
  cartTotal: number;
  isPending: boolean;
  error: string | null;
  onBack: () => void;
  onChangeNumber: () => void;
  onSubmit: (values: GuestCheckoutValues, coords: { latitude: number; longitude: number } | null) => void;
}) {
  const [values, setValues] = useState<GuestCheckoutValues>({
    firstName: initialFirstName,
    lastName: initialLastName,
    email: initialEmail,
    addressLine1: "",
    area: "",
    landmark: "",
  });

  function set<K extends keyof GuestCheckoutValues>(key: K, value: GuestCheckoutValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (typeof navigator !== "undefined" && navigator.geolocation && type === "DELIVERY") {
      navigator.geolocation.getCurrentPosition(
        (position) => onSubmit(values, { latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => onSubmit(values, null),
        { timeout: 6000 }
      );
    } else {
      onSubmit(values, null);
    }
  }

  const canSubmit =
    values.firstName.trim() && values.lastName.trim() && (type === "PICKUP" || values.addressLine1.trim());

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-10 lg:px-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-stone-400 transition-colors hover:text-stone-100"
      >
        <ArrowLeft size={15} /> Back to menu
      </button>

      <div className="mt-4 flex items-center gap-2.5">
        <span className="h-6 w-1 rounded-full bg-brand-red shadow-[0_0_10px_rgba(228,35,19,0.6)]" />
        <h1 className="font-display text-2xl uppercase tracking-tight text-stone-50">Your details</h1>
      </div>
      <p className="mt-1 pl-3.5 text-sm text-stone-400">
        {type === "DELIVERY" ? "So we know where to send your order." : "So the branch knows who's collecting."}
      </p>

      {error && <p className="mt-4 rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        {/* Every field carries autoComplete/inputMode so mobile keyboards and
            browser autofill can do as much of the typing as possible. */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <IconField
              icon={User}
              value={values.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              placeholder="First name"
              autoComplete="given-name"
            />
            <IconField
              icon={User}
              value={values.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              placeholder="Last name"
              autoComplete="family-name"
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-emerald-900/50 bg-emerald-950/20 py-3 pl-3.5 pr-3 text-sm">
            <span className="flex items-center gap-2 text-emerald-300">
              <ShieldCheck size={15} /> {verifiedPhone}
            </span>
            <button type="button" onClick={onChangeNumber} className="text-xs font-medium text-stone-400 underline hover:text-stone-200">
              Change number
            </button>
          </div>
          <IconField
            icon={Mail}
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="Email (optional)"
            type="email"
            inputMode="email"
            autoComplete="email"
          />

          {type === "DELIVERY" && (
            <div className="space-y-3 rounded-2xl border border-brand-cyan/15 bg-linear-to-b from-stone-900 to-stone-900/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-cyan">
                <MapPin size={13} /> Delivery address
              </p>
              <IconField
                icon={Home}
                value={values.addressLine1}
                onChange={(e) => set("addressLine1", e.target.value)}
                placeholder="Address (e.g. 12 Lagos Ave)"
                autoComplete="address-line1"
              />
              <div className="flex gap-3">
                <IconField
                  icon={MapPin}
                  value={values.area}
                  onChange={(e) => set("area", e.target.value)}
                  placeholder="Area (e.g. East Legon)"
                  autoComplete="address-level2"
                />
                <IconField
                  icon={Flag}
                  value={values.landmark}
                  onChange={(e) => set("landmark", e.target.value)}
                  placeholder="Landmark (optional)"
                  autoComplete="address-line2"
                />
              </div>
            </div>
          )}
        </div>

        {/* Grounds the page in real content instead of a lone form floating
            in empty space, and lets the customer confirm their cart survived
            while they type — sticky on desktop, first thing reachable after
            the form on mobile. */}
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 lg:sticky lg:top-6">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
            <ReceiptText size={13} /> Order summary
          </p>

          <ul className="mt-3 max-h-64 space-y-2.5 overflow-y-auto pr-1">
            {cart.map((item) => (
              <li key={item.key} className="flex items-center gap-2.5">
                <MenuImage src={item.imageUrl} alt={item.productName} className="size-11 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-100">
                    {item.quantity} × {item.productName}
                  </p>
                  {item.modifiersLabel && <p className="truncate text-xs text-stone-500">{item.modifiersLabel}</p>}
                </div>
                <p className="shrink-0 text-sm font-semibold text-brand-cyan">GHS {item.lineTotal.toFixed(2)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between border-t border-stone-800 pt-3">
            <span className="text-sm text-stone-400">Total</span>
            <span className="text-lg font-bold text-stone-50">GHS {cartTotal.toFixed(2)}</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            className="group relative mt-4 flex w-full items-center justify-center overflow-hidden rounded-2xl bg-brand-red py-3.5 font-display text-base uppercase tracking-wide text-white shadow-lg shadow-brand-red/25 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:scale-100"
          >
            <span className="absolute inset-0 -z-0 translate-x-[-100%] bg-brand-red-light transition-transform duration-300 group-hover:translate-x-0" />
            <span className="relative z-10">{isPending ? "Placing order…" : "Place order"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
