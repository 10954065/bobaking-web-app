"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Clock3, MapPin, MessageCircle, Navigation, Truck } from "lucide-react";
import { LogoLockup } from "@/components/brand/Logo";
import { SplashScreen } from "@/components/home/SplashScreen";
import { haversineDistanceKm } from "@/modules/delivery/services/fare.service";

type Branch = { id: string; name: string; address: string; latitude: number | null; longitude: number | null };
type Dish = {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  tag?: string;
  photo?: string;
  photoPosition?: string;
  /** CSS color for items with no usable photo — rendered as a color-block
   * typographic tile instead. */
  tone?: string;
};

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

      {/* Hero — full-bleed real shop photo, not an illustration. The source
          frame already puts the cup right-of-center against a plain wall, so
          the scrim only needs to darken the left two-thirds for text
          legibility rather than covering the whole frame. */}
      <section className="relative isolate min-h-[86vh] overflow-hidden sm:min-h-[92vh]">
        <Image
          src="/images/boba/blueberry-milk-tea.jpg"
          alt="Boba King blueberry milk tea, shot in the Winneba store"
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "68% 28%" }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, var(--color-brand-ink) 0%, color-mix(in srgb, var(--color-brand-ink) 88%, transparent) 34%, color-mix(in srgb, var(--color-brand-ink) 35%, transparent) 58%, color-mix(in srgb, var(--color-brand-ink) 10%, transparent) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/5"
          style={{ background: "linear-gradient(to top, var(--color-brand-ink) 0%, transparent 100%)" }}
        />

        <div className="relative mx-auto flex h-full max-w-5xl flex-col justify-end px-4 pb-14 pt-32 sm:px-6 sm:pb-20 md:px-8">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-cyan"
          >
            Winneba &middot; UEW North Campus
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mt-3 max-w-xl font-display text-[2.75rem] uppercase leading-[0.92] tracking-tight sm:text-6xl md:text-7xl"
          >
            Crowned
            <br />
            in boba.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="mt-5 max-w-sm text-sm text-brand-cream/75 sm:text-base"
          >
            Milk tea, fruit tea, brown sugar boba and waffles — shaken fresh at our counter, every cup.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/order"
              className="group relative inline-flex overflow-hidden rounded-full bg-brand-red px-9 py-3.5 font-display text-sm uppercase tracking-wide text-white shadow-lg shadow-brand-red/30 transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              <span className="relative z-10">Order now</span>
              <span className="absolute inset-0 z-0 -translate-x-full bg-brand-red-light transition-transform duration-300 group-hover:translate-x-0" />
            </Link>
            <Link
              href="#menu"
              className="rounded-full border border-white/20 px-8 py-3.5 font-display text-sm uppercase tracking-wide text-brand-cream/85 backdrop-blur-sm transition-colors hover:border-white/40 hover:text-brand-cream"
            >
              See the menu
            </Link>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-xs text-brand-cream/65"
          >
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="text-brand-cyan" />
              <dd>Yeenua Street, near UEW</dd>
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

        {/* Floating polaroid — a second real photo overlapping the hero edge,
            the one grid-breaking layering move on an otherwise flat frame. */}
        <motion.div
          initial={{ opacity: 0, y: 24, rotate: 6 }}
          animate={{ opacity: 1, y: 0, rotate: 5 }}
          transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
          className="absolute right-4 top-24 hidden w-36 overflow-hidden rounded-xl border-4 border-white/95 shadow-2xl sm:right-8 sm:top-28 sm:block sm:w-44 md:right-14"
        >
          <div className="relative aspect-4/5">
            <Image
              src="/images/boba/strawberry-milk-tea.jpg"
              alt="Strawberry milk tea with fresh strawberries"
              fill
              sizes="180px"
              className="object-cover"
              style={{ objectPosition: "center 40%" }}
            />
          </div>
          <p className="bg-white px-2 py-1.5 text-center font-display text-[10px] uppercase tracking-wide text-brand-ink">
            Strawberry &middot; GH₵45
          </p>
        </motion.div>
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

      {/* Menu — real cups, shot in-store, not icon tiles */}
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
                className="group relative mt-6 block h-72 overflow-hidden rounded-3xl border border-white/10 sm:h-80"
                style={featured.photo ? undefined : { background: featured.tone }}
              >
                {featured.photo ? (
                  <>
                    <Image
                      src={featured.photo}
                      alt={featured.name}
                      fill
                      sizes="(min-width: 640px) 960px, 100vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      style={{ objectPosition: featured.photoPosition }}
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(0deg, var(--color-brand-ink) 0%, color-mix(in srgb, var(--color-brand-ink) 55%, transparent) 45%, transparent 75%)",
                      }}
                    />
                  </>
                ) : (
                  <div
                    aria-hidden
                    className="bg-grain absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                  />
                )}
                <div className="relative flex h-full flex-col justify-end p-6 sm:p-8">
                  {featured.tag && (
                    <span className="mb-2 inline-flex w-fit rounded-full bg-brand-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-ink">
                      {featured.tag}
                    </span>
                  )}
                  <p className="font-display text-2xl uppercase tracking-tight text-white sm:text-3xl">{featured.name}</p>
                  {featured.description && (
                    <p className="mt-1.5 max-w-md text-sm text-white/75">{featured.description}</p>
                  )}
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
                className="group relative block aspect-square overflow-hidden rounded-2xl border border-white/10"
                style={dish.photo ? undefined : { background: dish.tone }}
              >
                {dish.photo ? (
                  <>
                    <Image
                      src={dish.photo}
                      alt={dish.name}
                      fill
                      sizes="(min-width: 640px) 240px, 45vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      style={{ objectPosition: dish.photoPosition }}
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(0deg, var(--color-brand-ink) 0%, color-mix(in srgb, var(--color-brand-ink) 25%, transparent) 55%, transparent 78%)",
                      }}
                    />
                  </>
                ) : (
                  <div
                    aria-hidden
                    className="bg-grain absolute inset-0 flex items-center justify-center transition-transform duration-500 group-hover:scale-110"
                  >
                    <span className="font-display text-4xl uppercase text-white/10">B</span>
                  </div>
                )}
                {dish.tag && (
                  <span className="absolute left-2 top-2 rounded-full bg-brand-red px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                    {dish.tag}
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="truncate text-sm font-semibold text-white">{dish.name}</p>
                  <p className="mt-0.5 text-xs font-semibold text-brand-cyan">{formatPrice(dish.price)}</p>
                </div>
              </MotionLink>
            ))}
          </div>
        </div>
      </section>

      {/* Behind the counter — two real, unposed shots proving this is a
          working shop with hands on the drinks, not a stock-photo storefront. */}
      <section className="px-4 pb-14 sm:px-6 sm:pb-20 md:px-8">
        <div className="mx-auto max-w-5xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4 }}
            className="text-[11px] font-semibold uppercase tracking-[0.35em] text-brand-cyan"
          >
            Made to order
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mt-1.5 max-w-md font-display text-2xl uppercase tracking-tight text-brand-cream sm:text-3xl"
          >
            Shaken, sealed and handed over — never sitting around.
          </motion.h2>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-5 md:gap-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4 }}
              className="relative aspect-5/4 overflow-hidden rounded-2xl border border-white/10 sm:col-span-3"
            >
              <Image
                src="/images/boba/pouring-drink.jpg"
                alt="Sealing a fresh cup of milk tea at the Boba King counter"
                fill
                sizes="(min-width: 640px) 600px, 100vw"
                className="object-cover"
                style={{ objectPosition: "center 42%" }}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="relative aspect-5/4 overflow-hidden rounded-2xl border border-white/10 sm:col-span-2"
            >
              <Image
                src="/images/boba/closeup-strawberry.jpg"
                alt="Strawberry milk tea with visible tapioca pearls"
                fill
                sizes="(min-width: 640px) 400px, 100vw"
                className="object-cover"
                style={{ objectPosition: "center 30%" }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Visit — real shop interior as the backdrop instead of a plain list */}
      <section className="px-4 pb-14 sm:px-6 sm:pb-20 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl border border-white/10">
            <div className="relative h-64 sm:h-80">
              <Image
                src="/images/boba/interior-hangout.jpg"
                alt="Customers hanging out inside the Boba King Winneba store"
                fill
                sizes="(min-width: 1024px) 960px, 100vw"
                className="object-cover"
                style={{ objectPosition: "center 47%" }}
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(0deg, var(--color-brand-ink) 0%, color-mix(in srgb, var(--color-brand-ink) 60%, transparent) 40%, color-mix(in srgb, var(--color-brand-ink) 15%, transparent) 75%, transparent 100%)",
                }}
              />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-brand-cyan">Find us</p>
                <h2 className="mt-1 font-display text-2xl uppercase tracking-tight text-white sm:text-3xl">Come sip. Come chill.</h2>
              </div>
            </div>

            <div className="space-y-3 bg-white/3 p-5 sm:p-6">
              {rankedBranches.map((branch, index) => (
                <motion.div
                  key={branch.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: index * 0.06, duration: 0.35 }}
                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-brand-ink/60 p-5 sm:flex-row sm:items-center sm:justify-between"
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
