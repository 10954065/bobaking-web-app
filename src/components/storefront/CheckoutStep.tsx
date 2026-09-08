"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Flag, Home, Mail, MapPin, Phone, User } from "lucide-react";

export interface GuestCheckoutValues {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  addressLine1: string;
  area: string;
  landmark: string;
}

// Sunken 3D edge + brand-glow focus ring, matching the admin dashboard's
// form-field treatment — dark-theme variant for the customer-facing flow.
const inputClass =
  "w-full rounded-xl border border-stone-700/80 bg-stone-900/70 py-3 pl-10 pr-3.5 text-sm text-stone-100 placeholder:text-stone-500 outline-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.55),inset_0_-1px_0_rgba(255,255,255,0.04)] transition-shadow duration-150 focus:border-brand-red/50 focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_0_0_3px_rgba(228,35,19,0.18)]";

function IconField({
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: LucideIcon }) {
  return (
    <div className="relative flex-1">
      <Icon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
      <input {...props} className={inputClass} />
    </div>
  );
}

export function CheckoutStep({
  type,
  cartTotal,
  isPending,
  error,
  onBack,
  onSubmit,
}: {
  type: "DELIVERY" | "PICKUP";
  cartTotal: number;
  isPending: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: (values: GuestCheckoutValues, coords: { latitude: number; longitude: number } | null) => void;
}) {
  const [values, setValues] = useState<GuestCheckoutValues>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
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
    values.firstName.trim() &&
    values.lastName.trim() &&
    values.phone.trim().length >= 7 &&
    (type === "PICKUP" || values.addressLine1.trim());

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:py-10">
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

      <div className="mt-5 space-y-3">
        <div className="flex gap-3">
          <IconField
            icon={User}
            value={values.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            placeholder="First name"
          />
          <IconField
            icon={User}
            value={values.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            placeholder="Last name"
          />
        </div>
        <IconField
          icon={Phone}
          value={values.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="Phone number"
          type="tel"
        />
        <IconField
          icon={Mail}
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="Email (optional)"
          type="email"
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
            />
            <div className="flex gap-3">
              <IconField
                icon={MapPin}
                value={values.area}
                onChange={(e) => set("area", e.target.value)}
                placeholder="Area (e.g. East Legon)"
              />
              <IconField
                icon={Flag}
                value={values.landmark}
                onChange={(e) => set("landmark", e.target.value)}
                placeholder="Landmark (optional)"
              />
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isPending}
        className="group relative mt-6 flex w-full items-center justify-center overflow-hidden rounded-2xl bg-brand-red py-3.5 font-display text-base uppercase tracking-wide text-white shadow-lg shadow-brand-red/25 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:scale-100"
      >
        <span className="absolute inset-0 -z-0 translate-x-[-100%] bg-brand-red-light transition-transform duration-300 group-hover:translate-x-0" />
        <span className="relative z-10">{isPending ? "Placing order…" : `Place order · GHS ${cartTotal.toFixed(2)}`}</span>
      </button>
    </div>
  );
}
