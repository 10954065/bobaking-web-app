"use client";

import { useEffect, useState, useTransition } from "react";
import {
  listCustomerAddressesAction,
  createCustomerAddressAction,
  type PosCustomerAddress,
} from "@/modules/pos/actions/pos.actions";

export function DeliveryAddressPanel({
  customerId,
  customerName,
  onSelect,
}: {
  customerId: string;
  customerName: string;
  onSelect: (addressId: string) => void;
}) {
  const [addresses, setAddresses] = useState<PosCustomerAddress[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [addressLine1, setAddressLine1] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    listCustomerAddressesAction(customerId)
      .then((found) => {
        setAddresses(found);
        setShowNewForm(found.length === 0);
      })
      .finally(() => setLoaded(true));
  }, [customerId]);

  function handleCreate() {
    if (!addressLine1) return;
    startTransition(async () => {
      const address = await createCustomerAddressAction(customerId, {
        addressLine1,
        area: area || undefined,
        landmark: landmark || undefined,
        isDefault: addresses.length === 0,
      });
      setAddresses((prev) => [...prev, address]);
      onSelect(address.id);
    });
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-stone-50">Delivery address</h1>
      <p className="mb-6 text-sm text-stone-400">
        Where should this order go for {customerName}? The area determines the delivery fee.
      </p>

      {!loaded && <p className="text-sm text-stone-500">Loading addresses…</p>}

      {loaded && addresses.length > 0 && (
        <ul className="mb-6 divide-y divide-stone-800 rounded-lg border border-stone-800">
          {addresses.map((address) => (
            <li key={address.id}>
              <button
                onClick={() => onSelect(address.id)}
                className="flex w-full flex-col items-start px-4 py-3 text-left transition-colors hover:bg-stone-800"
              >
                <span className="font-medium text-stone-100">{address.addressLine1}</span>
                <span className="text-sm text-stone-500">
                  {[address.area, address.landmark].filter(Boolean).join(" · ") || "No area/landmark set"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {loaded && !showNewForm && (
        <button onClick={() => setShowNewForm(true)} className="text-sm font-medium text-orange-500 hover:text-orange-400">
          + New address
        </button>
      )}

      {loaded && showNewForm && (
        <div className="space-y-3 rounded-lg border border-stone-800 p-4">
          <input
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            placeholder="Address (e.g. 12 Lagos Ave)"
            className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none focus:border-orange-500"
          />
          <div className="flex gap-2">
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Area (e.g. East Legon)"
              className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none focus:border-orange-500"
            />
            <input
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="Landmark (optional)"
              className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none focus:border-orange-500"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={isPending || !addressLine1}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Use this address"}
          </button>
        </div>
      )}
    </div>
  );
}
