"use client";

import { useState, useTransition } from "react";
import { searchCustomersAction, createCustomerAction, createWalkInCustomerAction } from "@/modules/pos/actions/pos.actions";

export interface PosCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

const ORDER_TYPES = [
  { value: "PICKUP", label: "Pickup" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "DINE_IN", label: "Dine-in" },
] as const;

export function CustomerPanel({
  onStart,
}: {
  onStart: (customer: PosCustomer, type: (typeof ORDER_TYPES)[number]["value"]) => void;
}) {
  const [type, setType] = useState<(typeof ORDER_TYPES)[number]["value"]>("PICKUP");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PosCustomer[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      const found = await searchCustomersAction(value);
      setResults(found);
    });
  }

  function handleWalkIn() {
    startTransition(async () => {
      const customer = await createWalkInCustomerAction();
      onStart(customer, type);
    });
  }

  function handleCreate() {
    if (!firstName || !lastName || (!phone && !email)) return;
    startTransition(async () => {
      const customer = await createCustomerAction({
        firstName,
        lastName,
        phone: phone || undefined,
        email: email || undefined,
      });
      onStart(customer, type);
    });
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-stone-50">New order</h1>
      <p className="mb-6 text-sm text-stone-400">Choose the order type and select or create a customer.</p>

      <div className="mb-6 flex gap-2">
        {ORDER_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              type === t.value ? "bg-brand-red-600 text-white" : "bg-stone-800 text-stone-300 hover:bg-stone-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name, phone, or email"
          className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-sm text-stone-100 outline-none focus:border-brand-red-500"
        />
        <button
          onClick={handleWalkIn}
          disabled={isPending}
          className="whitespace-nowrap rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-semibold text-stone-100 transition-colors hover:bg-stone-700 disabled:opacity-50"
        >
          Quick walk-in
        </button>
      </div>

      {results.length > 0 && (
        <ul className="mb-4 divide-y divide-stone-800 rounded-lg border border-stone-800">
          {results.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onStart(c, type)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-stone-800"
              >
                <span className="font-medium text-stone-100">
                  {c.firstName} {c.lastName}
                </span>
                <span className="text-sm text-stone-500">{c.phone ?? c.email ?? "—"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!showNewForm ? (
        <button onClick={() => setShowNewForm(true)} className="text-sm font-medium text-brand-red-500 hover:text-brand-red-400">
          + New customer
        </button>
      ) : (
        <div className="space-y-3 rounded-lg border border-stone-800 p-4">
          <div className="flex gap-2">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-red-500"
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-red-500"
            />
          </div>
          <div className="flex gap-2">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-red-500"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-red-500"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={isPending || !firstName || !lastName || (!phone && !email)}
            className="rounded-lg bg-brand-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red-500 disabled:opacity-50"
          >
            Create &amp; start order
          </button>
        </div>
      )}
    </div>
  );
}
