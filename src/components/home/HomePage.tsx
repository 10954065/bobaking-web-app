"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Clock3, MapPin, MessageCircle, Navigation, Truck } from "lucide-react";
import { Logo, LogoLockup } from "@/components/brand/Logo";
import { BobaCup, DishGlyph } from "@/components/brand/DrinkGlyphs";
import { SplashScreen } from "@/components/home/SplashScreen";
import { haversineDistanceKm } from "@/modules/delivery/services/fare.service";

type Branch = { id: string; name: string; address: string; latitude: number | null; longitude: number | null };
type Dish = { id: string; name: string; price: number; image: string | null; description?: string | null; tag?: string };

const MotionLink = motion.create(Link);

const MARQUEE_ITEMS = ["MILK TEA", "FRUIT TEA", "BROWN SUGAR BOBA", "WAFFLES", "SIP · CHILL · REPEAT", "WINNEBA · UEW NORTH CAMPUS"];

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
  const [featured, ...restDishes] = dishes;

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
      <section className="bg-grain relative isolate overflow-hidden px-4 pb-14 pt-12 sm:px-6 sm:pt-16 md:px-8 md:pt-20">
        <div className="mx-auto grid max-w-5xl gap-14 md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-8">
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-cyan"
            >
              Sip. Chill. Repeat.
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mt-3 font-display text-[2.6rem] uppercase leading-[0.94] tracking-tight sm:text-5xl md:text-[3.1rem] lg:text-[3.6rem]"
            >
              Brewed daily.
              <br />
              Shaken by hand.
              <br />
              <span className="text-brand-red-light">Crowned in boba.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="mt-5 max-w-sm text-sm text-brand-cream/70 sm:text-base"
            >
              Milk tea, fruit tea, brown sugar boba and waffles — made fresh at our counter near UEW North Campus, Winneba.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start"
            >
              <Link
                href="/order"
                className="group relative inline-flex overflow-hidden rounded-full bg-brand-red px-9 py-3.5 font-display text-sm uppercase tracking-wide text-white shadow-lg shadow-brand-red/30 transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                <span className="relative z-10">Order now</span>
                <span className="absolute inset-0 -z-0 translate-x-[-100%] bg-brand-red-light transition-transform duration-300 group-hover:translate-x-0" />
              </Link>
              <Link
                href="#menu"
                className="rounded-full border border-white/15 px-8 py-3.5 font-display text-sm uppercase tracking-wide text-brand-cream/80 transition-colors hover:border-white/30 hover:text-brand-cream"
              >
                See the menu
              </Link>
            </motion.div>

            <motion.dl
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="mt-9 flex flex-wrap justify-center gap-x-7 gap-y-3 text-xs text-brand-cream/60 md:justify-start"
            >
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-brand-cyan" />
                <dd>Winneba, UEW North</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock3 size={14} className="text-brand-cyan" />
                <dd>11am – 9pm daily</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck size={14} className="text-brand-cyan" />
                <dd>Pickup &amp; delivery</dd>
              </div>
            </motion.dl>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
            className="relative mx-auto flex h-[360px] w-full max-w-sm items-center justify-center sm:h-[420px]"
          >
            <div
              aria-hidden
              className="absolute inset-0 rounded-full bg-brand-red/20 blur-[90px]"
              style={{ background: "radial-gradient(circle, var(--color-brand-cyan) 0%, transparent 65%)", opacity: 0.16 }}
            />
            <motion.div
              initial={{ y: 0 }}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <BobaCup size={210} liquidColor="var(--color-brand-red)" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10, rotate: -6 }}
              animate={{ opacity: 1, y: 0, rotate: -6 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="absolute left-0 top-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-brand-ink/80 px-3 py-2 shadow-xl backdrop-blur sm:left-4"
            >
              <BobaCup size={26} liquidColor="var(--color-brand-red-700)" />
              <span className="font-display text-[11px] uppercase tracking-wide text-brand-cream/90">Brown Sugar Boba</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -10, rotate: 5 }}
              animate={{ opacity: 1, y: 0, rotate: 5 }}
              transition={{ delay: 0.75, duration: 0.4 }}
              className="absolute bottom-6 right-0 rounded-2xl border border-brand-gold/30 bg-brand-ink/80 px-3.5 py-2 text-right shadow-xl backdrop-blur sm:right-2"
            >
              <p className="font-display text-[11px] uppercase tracking-wide text-brand-gold">Buy 3, Get 1</p>
              <p className="text-[10px] text-brand-cream/60">In-store promo</p>
            </motion.div>
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

      {/* Menu */}
      <section id="menu" className="px-4 py-14 sm:px-6 sm:py-20 md:px-8">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4 }}
            className="flex items-end justify-between"
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-brand-cyan">The menu</p>
              <h2 className="mt-1.5 font-display text-2xl uppercase tracking-tight text-brand-cream sm:text-3xl">Crowd favorites</h2>
            </div>
            <Link href="/order" className="shrink-0 text-xs font-semibold uppercase tracking-widest text-brand-cyan">
              Full menu
            </Link>
          </motion.div>

          {featured && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45 }}
            >
              <Link
                href={`/order?dish=${featured.id}`}
                className="bg-grain group mt-6 flex flex-col items-center gap-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center transition-colors hover:border-brand-red/40 sm:flex-row sm:items-center sm:p-8 sm:text-left"
              >
                <div
                  className="flex h-36 w-36 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: "color-mix(in srgb, var(--color-brand-red) 14%, transparent)" }}
                >
                  <DishGlyph name={featured.name} size={104} className="transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="min-w-0">
                  {featured.tag && (
                    <span className="inline-flex rounded-full bg-brand-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-ink">
                      {featured.tag}
                    </span>
                  )}
                  <p className="mt-2 font-display text-xl uppercase tracking-tight text-brand-cream sm:text-2xl">{featured.name}</p>
                  {featured.description && <p className="mt-1.5 max-w-md text-sm text-brand-cream/60">{featured.description}</p>}
                  <p className="mt-2.5 font-display text-lg text-brand-cyan">{formatPrice(featured.price)}</p>
                </div>
              </Link>
            </motion.div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
            {restDishes.map((dish, index) => (
              <MotionLink
                key={dish.id}
                href={`/order?dish=${dish.id}`}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: (index % 4) * 0.07, duration: 0.4, ease: [0.34, 1.2, 0.64, 1] }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition-colors hover:border-brand-red/40"
              >
                <div
                  className="relative flex aspect-square items-center justify-center overflow-hidden"
                  style={{ background: "color-mix(in srgb, var(--color-brand-cream) 6%, transparent)" }}
                >
                  <DishGlyph name={dish.name} size={72} className="transition-transform duration-500 group-hover:scale-110" />
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

      {/* Visit */}
      <section className="px-4 pb-14 sm:px-6 sm:pb-20 md:px-8">
        <div className="mx-auto max-w-5xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4 }}
            className="text-[11px] font-semibold uppercase tracking-[0.35em] text-brand-cyan"
          >
            Find us
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mt-1.5 font-display text-2xl uppercase tracking-tight text-brand-cream sm:text-3xl"
          >
            Visit the throne room
          </motion.h2>

          <div className="mt-6 space-y-3">
            {rankedBranches.map((branch, index) => (
              <motion.div
                key={branch.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: index * 0.06, duration: 0.35 }}
                className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-cyan/15 text-brand-cyan">
                    <MapPin size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-brand-cream">{branch.name}</p>
                      {branch.id === closestId && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-cyan/15 px-2 py-0.5 text-[10px] font-semibold text-brand-cyan">
                          <Navigation size={9} /> Nearest to you
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-brand-cream/50">
                      {branch.address}
                      {branch.distanceKm != null && ` · ${branch.distanceKm.toFixed(1)} km away`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-brand-cream/60 sm:justify-end">
                  <span className="flex items-center gap-1.5">
                    <Clock3 size={13} className="text-brand-cyan" /> 11am – 9pm daily
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle size={13} className="text-brand-cyan" /> 0593 422 400
                  </span>
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
            <span>Open daily, 11am to 9pm</span>
            <span>0248 978 606 &middot; WhatsApp 0593 422 400</span>
            <span>Pickup and delivery &middot; Yeenua Street, near UEW, Winneba</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
