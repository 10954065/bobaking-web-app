"use client";

import { useState } from "react";
import { ArrowLeft, MapPin } from "lucide-react";

export interface GuestCheckoutValues {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  addressLine1: string;
  area: string;
  landmark: string;
}

const inputClass =
  "w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 outline-none focus:border-orange-500";

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

      <h1 className="mt-4 text-xl font-bold text-stone-50">Your details</h1>
      <p className="mt-1 text-sm text-stone-400">
        {type === "DELIVERY" ? "So we know where to send your order." : "So the branch knows who's collecting."}
      </p>

      {error && <p className="mt-4 rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}

      <div className="mt-5 space-y-3">
        <div className="flex gap-3">
          <input
            value={values.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            placeholder="First name"
            className={inputClass}
          />
          <input
            value={values.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            placeholder="Last name"
            className={inputClass}
          />
        </div>
        <input
          value={values.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="Phone number"
          type="tel"
          className={inputClass}
        />
        <input
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="Email (optional)"
          type="email"
          className={inputClass}
        />

        {type === "DELIVERY" && (
          <div className="space-y-3 rounded-xl border border-stone-800 bg-stone-900 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-400">
              <MapPin size={13} /> Delivery address
            </p>
            <input
              value={values.addressLine1}
              onChange={(e) => set("addressLine1", e.target.value)}
              placeholder="Address (e.g. 12 Lagos Ave)"
              className={inputClass}
            />
            <div className="flex gap-3">
              <input
                value={values.area}
                onChange={(e) => set("area", e.target.value)}
                placeholder="Area (e.g. East Legon)"
                className={inputClass}
              />
              <input
                value={values.landmark}
                onChange={(e) => set("landmark", e.target.value)}
                placeholder="Landmark (optional)"
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isPending}
        className="mt-6 flex w-full items-center justify-center rounded-2xl bg-orange-600 py-3.5 text-base font-semibold text-white transition-colors hover:bg-orange-500 disabled:opacity-40"
      >
        {isPending ? "Placing order…" : `Place order · GHS ${cartTotal.toFixed(2)}`}
      </button>
    </div>
  );
}
