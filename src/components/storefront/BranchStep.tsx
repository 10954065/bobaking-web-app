"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Bike, Store, MapPin, Navigation, ChevronRight } from "lucide-react";
import { haversineDistanceKm } from "@/modules/delivery/services/fare.service";
import type { StorefrontBranch } from "@/modules/storefront/actions/storefront.actions";

export function BranchStep({
  branches,
  type,
  onSelectType,
  onContinue,
}: {
  branches: StorefrontBranch[];
  type: "DELIVERY" | "PICKUP";
  onSelectType: (type: "DELIVERY" | "PICKUP") => void;
  onContinue: (branchId: string) => void;
}) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => {},
      { timeout: 8000 }
    );
  }, []);

  const rankedBranches = useMemo(() => {
    const withDistance = branches.map((branch) => ({
      ...branch,
      distanceKm:
        userLocation && branch.latitude != null && branch.longitude != null
          ? haversineDistanceKm(userLocation, { latitude: branch.latitude, longitude: branch.longitude })
          : null,
    }));
    return withDistance.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }, [branches, userLocation]);

  const closestId = rankedBranches[0]?.distanceKm != null ? rankedBranches[0].id : null;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">Flicks &amp; Licks</p>
      <h1 className="mt-2 text-2xl font-bold text-stone-50 sm:text-3xl">How would you like your order?</h1>
      <p className="mt-1.5 text-sm text-stone-400">Choose delivery or pick a branch to collect from.</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => onSelectType("DELIVERY")}
          className={`flex flex-col items-center gap-2 rounded-2xl border py-6 transition-colors ${
            type === "DELIVERY" ? "border-orange-600 bg-orange-950/30 text-orange-300" : "border-stone-800 bg-stone-900 text-stone-400 hover:border-stone-700"
          }`}
        >
          <Bike size={24} />
          <span className="text-sm font-semibold">Delivery</span>
        </button>
        <button
          onClick={() => onSelectType("PICKUP")}
          className={`flex flex-col items-center gap-2 rounded-2xl border py-6 transition-colors ${
            type === "PICKUP" ? "border-orange-600 bg-orange-950/30 text-orange-300" : "border-stone-800 bg-stone-900 text-stone-400 hover:border-stone-700"
          }`}
        >
          <Store size={24} />
          <span className="text-sm font-semibold">Pickup</span>
        </button>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-stone-300">
        {type === "DELIVERY" ? "Nearest branch to deliver from" : "Pick a branch to collect from"}
      </h2>
      <div className="mt-3 space-y-2.5">
        {rankedBranches.map((branch, index) => (
          <motion.button
            key={branch.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            onClick={() => setSelectedBranchId(branch.id)}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
              selectedBranchId === branch.id ? "border-orange-600 bg-orange-950/20" : "border-stone-800 bg-stone-900 hover:border-stone-700"
            }`}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-stone-800 text-stone-400">
              <MapPin size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-stone-100">{branch.name}</p>
                {branch.id === closestId && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    <Navigation size={9} /> Closest
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-stone-500">
                {branch.address}
                {branch.distanceKm != null && ` · ${branch.distanceKm.toFixed(1)} km away`}
              </p>
            </div>
          </motion.button>
        ))}
      </div>

      <button
        onClick={() => selectedBranchId && onContinue(selectedBranchId)}
        disabled={!selectedBranchId}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 py-3.5 text-base font-semibold text-white transition-colors hover:bg-orange-500 disabled:opacity-40"
      >
        See the menu <ChevronRight size={18} />
      </button>
    </div>
  );
}
