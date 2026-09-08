"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { MapPin, Navigation, UtensilsCrossed } from "lucide-react";
import { Logo, LogoLockup } from "@/components/brand/Logo";
import { SplashScreen } from "@/components/home/SplashScreen";
import { haversineDistanceKm } from "@/modules/delivery/services/fare.service";

type Branch = { id: string; name: string; address: string; latitude: number | null; longitude: number | null };
type Dish = { id: string; name: string; price: number; image: string | null; tag?: string };

const MotionLink = motion.create(Link);

const MARQUEE_ITEMS = ["MILE 7 T-JUNCTION", "ACHIMOTA", "EAST LEGON", "DANSOMAN", "THE SUYA BOSS", "OPEN DAILY 10AM – 11PM"];

function formatPrice(n: number): string {
  return Number.isInteger(n) ? `GH₵${n}` : `GH₵${n.toFixed(2)}`;
}

export function HomePage({ branches, dishes }: { branches: Branch[]; dishes: Dish[] }) {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    // Requesting on the homepage (rather than only later, at branch selection)
    // means the permission prompt is already resolved by the time the
    // customer picks delivery vs. pickup, and lets this page itself show
    // which branch is actually closest to them.
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
    if (!userLocation) return withDistance;
    return withDistance.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }, [branches, userLocation]);

  const closestId = userLocation && rankedBranches[0]?.distanceKm != null ? rankedBranches[0].id : null;

  return (
    <div className="flex min-h-screen flex-col bg-brand-ink text-brand-cream">
      <SplashScreen />

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-brand-ink/90 px-4 py-3 backdrop-blur sm:px-6 md:px-8">
        <LogoLockup size={38} />
        <Link
          href="/order"
          className="rounded-full bg-brand-red px-4 py-2 font-display text-xs uppercase tracking-wide text-white shadow-lg shadow-brand-red/25 sm:px-5"
        >
          Order now
        </Link>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden px-4 pb-10 pt-10 sm:px-6 sm:pt-14 md:px-8 md:pt-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-brand-red/25 blur-[110px]"
        />

        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:items-center md:gap-8 lg:gap-6">
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>
              <Logo size={72} />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="mt-5 text-xs font-semibold uppercase tracking-[0.4em] text-brand-cyan"
            >
              The Suya Boss
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="mt-3 font-display text-[2.4rem] uppercase leading-[0.95] tracking-tight sm:text-5xl md:text-[3.2rem] lg:text-6xl"
            >
              Order online.
              <br />
              <span className="text-brand-red-light">We&apos;ll take it</span>
              <br />
              from there.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="mt-5 max-w-sm text-sm text-brand-cream/70 sm:text-base"
            >
              Delivery or pickup from Mile 7, Achimota, East Legon and Dansoman. Loaded fries, suya, shawarma and pizza, tracked live from our kitchen to your door.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-8"
            >
              <Link
                href="/order"
                className="group relative inline-flex overflow-hidden rounded-full bg-brand-red px-9 py-3.5 font-display text-sm uppercase tracking-wide text-white shadow-lg shadow-brand-red/30 transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                <span className="relative z-10">Order now</span>
                <span className="absolute inset-0 -z-0 translate-x-[-100%] bg-brand-red-light transition-transform duration-300 group-hover:translate-x-0" />
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="relative mx-auto grid w-full max-w-md grid-cols-2 gap-3"
          >
            <div className="relative col-span-2 aspect-[16/10] overflow-hidden rounded-3xl">
              <Image src="/images/menu/flicks-special-pizza.jpg" alt="Flicks Special Pizza" fill sizes="(min-width: 1024px) 400px, 90vw" className="object-cover" priority />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-2xl">
              <Image src="/images/menu/chicken-suya.jpg" alt="Chicken Suya" fill sizes="(min-width: 768px) 220px, 45vw" className="object-cover" />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-2xl">
              <Image src="/images/menu/loaded-fries-cheese.jpg" alt="Loaded Fries with Cheese" fill sizes="(min-width: 768px) 220px, 45vw" className="object-cover" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Marquee */}
      <div className="relative overflow-hidden border-y border-white/10 bg-brand-red py-2.5">
        <div className="flex w-max animate-marquee whitespace-nowrap">
          {[0, 1].map((rep) => (
            <div key={rep} className="flex shrink-0 items-center">
              {MARQUEE_ITEMS.map((item) => (
                <span key={`${rep}-${item}`} className="mx-4 font-display text-xs uppercase tracking-[0.25em] text-white/90">
                  {item} <span className="ml-4 text-white/40">&bull;</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Fan favorites — real menu, real photos, tap one to order it */}
      <section className="px-4 py-14 sm:px-6 sm:py-20 md:px-8">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4 }}
            className="flex items-end justify-between"
          >
            <div>
              <h2 className="font-display text-2xl uppercase tracking-tight text-brand-cream sm:text-3xl">Fan favorites</h2>
              <p className="mt-1 text-xs text-brand-cream/50 sm:text-sm">Tap a dish to pick a branch and order it</p>
            </div>
            <Link href="/order" className="shrink-0 text-xs font-semibold uppercase tracking-widest text-brand-cyan">
              Full menu
            </Link>
          </motion.div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
            {dishes.map((dish, index) => (
              <MotionLink
                key={dish.id}
                href={`/order?dish=${dish.id}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: (index % 4) * 0.08, duration: 0.4 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition-colors hover:border-brand-red/40"
              >
                <div className="relative aspect-square overflow-hidden">
                  {dish.image ? (
                    <Image
                      src={dish.image}
                      alt={dish.name}
                      fill
                      sizes="(min-width: 640px) 220px, 45vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-brand-red/10 text-brand-red-light">
                      <UtensilsCrossed size={32} strokeWidth={1.5} />
                    </div>
                  )}
                  {dish.tag && (
                    <span className="absolute left-2 top-2 rounded-full bg-brand-red px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                      {dish.tag}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-brand-cream">{dish.name}</p>
                  <p className="mt-0.5 text-xs font-semibold text-brand-cyan">{formatPrice(dish.price)}</p>
                </div>
              </MotionLink>
            ))}
          </div>
        </div>
      </section>

      {/* Branches */}
      <section className="px-4 pb-14 sm:px-6 sm:pb-20 md:px-8">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4 }}
            className="font-display text-2xl uppercase tracking-tight text-brand-cream sm:text-3xl"
          >
            4 branches and counting
          </motion.h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 md:gap-4">
            {rankedBranches.map((branch, index) => (
              <motion.div
                key={branch.id}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: index * 0.06, duration: 0.35 }}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-cyan/15 text-brand-cyan">
                  <MapPin size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-brand-cream">{branch.name}</p>
                    {branch.id === closestId && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-cyan/15 px-2 py-0.5 text-[10px] font-semibold text-brand-cyan">
                        <Navigation size={9} /> Nearest to you
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-brand-cream/50">
                    {branch.address}
                    {branch.distanceKm != null && ` · ${branch.distanceKm.toFixed(1)} km away`}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 px-4 py-8 sm:px-6 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <LogoLockup size={32} />
          <div className="flex flex-col gap-1 text-xs text-brand-cream/60 sm:items-end">
            <span>Mon to Sun, 10am to 11pm</span>
            <span>0302 208 054 &middot; 0242 438 720</span>
            <span>Delivery and pickup, four branches across Accra</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
