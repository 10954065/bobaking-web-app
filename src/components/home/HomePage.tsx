"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Clock3, MapPin, MessageCircle, Navigation, Phone, Search, Star, Truck } from "lucide-react";
import { LogoLockup } from "@/components/brand/Logo";
import { SplashScreen } from "@/components/home/SplashScreen";
import { haversineDistanceKm } from "@/modules/delivery/services/fare.service";

type Branch = { id: string; name: string; address: string; latitude: number | null; longitude: number | null };
type Dish = { id: string; name: string; price: number; tag?: string; photo: string; photoPosition: string };

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

  return (
    <div className="flex min-h-screen flex-col bg-brand-cream text-brand-ink">
      <SplashScreen />

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-brand-ink/10 bg-brand-cream/95 px-4 py-3 backdrop-blur sm:px-6 md:px-8">
        <LogoLockup size={38} tone="ink" />
        <Link
          href="/order"
          className="rounded-full bg-brand-red px-4 py-2 font-display text-xs uppercase tracking-wide text-white shadow-lg shadow-brand-red/25 sm:px-5"
        >
          Order now
        </Link>
      </header>

      {/* Hero — a compact split banner, not a full-viewport scroller: a cream
          copy panel (dotted texture + a rounded "bite" bleeding into the next
          panel) beside a bold teal panel holding one real product photo,
          mirroring a classic food-delivery hero layout. */}
      <section className="px-3 pt-3 sm:px-6 sm:pt-6 md:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] sm:rounded-[2.25rem]">
          <div className="grid sm:grid-cols-[1.05fr_0.95fr]">
            <div className="bg-dotted relative flex min-h-[300px] flex-col justify-center gap-4 bg-brand-cream px-7 py-12 text-center sm:min-h-[420px] sm:px-10 sm:py-0 sm:text-left md:pl-16">
              <div className="hero-wave-cap hidden bg-brand-cream sm:block" aria-hidden />

              {/* Decorative slider-dot rail, echoing the reference hero. */}
              <div className="absolute left-5 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-2 md:flex">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className={`size-1.5 rounded-full ${i === 1 ? "ring-2 ring-brand-red ring-offset-2 ring-offset-brand-cream" : ""} bg-brand-red`} />
                ))}
              </div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="relative z-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-brand-red-700">Winneba &middot; UEW North Campus</p>
                <h1 className="mt-2 font-display text-[2.1rem] uppercase leading-[0.98] tracking-tight sm:text-4xl md:text-[2.6rem]">
                  We brew the
                  <br />
                  taste of boba
                </h1>
                <p className="mx-auto mt-3 max-w-xs text-sm text-brand-ink/65 sm:mx-0">
                  Milk tea, fruit tea, brown sugar boba and waffles — get it delivered right to your door.
                </p>

                <Link
                  href="/order"
                  className="mx-auto mt-6 flex h-12 w-full max-w-[330px] items-center gap-3 rounded-full bg-white pl-5 shadow-[0_5px_18px_rgba(40,38,24,0.1)] transition-transform hover:scale-[1.02] sm:mx-0"
                >
                  <Search size={15} className="shrink-0 text-brand-ink/40" />
                  <span className="flex-1 truncate text-left text-xs text-brand-ink/50">What are you craving?</span>
                  <span className="mr-1 flex h-9 shrink-0 items-center rounded-full bg-brand-red px-5 font-display text-xs uppercase tracking-wide text-white">
                    Find it
                  </span>
                </Link>
              </motion.div>
            </div>

            <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden bg-brand-cyan sm:min-h-[420px]">
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative h-[78%] w-[72%] overflow-hidden rounded-2xl border-4 border-white/90 shadow-2xl sm:h-[72%] sm:w-[62%]"
              >
                <Image
                  src="/images/boba/blueberry-milk-tea.jpg"
                  alt="Boba King blueberry milk tea, shot in the Winneba store"
                  fill
                  priority
                  sizes="(min-width: 640px) 420px, 60vw"
                  className="object-cover"
                  style={{ objectPosition: "68% 30%" }}
                />
              </motion.div>

              <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 flex-col gap-2.5 rounded-full bg-white/95 p-2 shadow-lg sm:flex">
                <a
                  href="tel:0248978606"
                  aria-label="Call Boba King"
                  className="flex size-8 items-center justify-center rounded-full text-brand-ink/70 transition-colors hover:bg-brand-red hover:text-white"
                >
                  <Phone size={13} />
                </a>
                <a
                  href="https://wa.me/233593422400"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp Boba King"
                  className="flex size-8 items-center justify-center rounded-full text-brand-ink/70 transition-colors hover:bg-brand-red hover:text-white"
                >
                  <MessageCircle size={13} />
                </a>
                <Link
                  href="#visit"
                  aria-label="Find Boba King on the map"
                  className="flex size-8 items-center justify-center rounded-full text-brand-ink/70 transition-colors hover:bg-brand-red hover:text-white"
                >
                  <MapPin size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <motion.dl
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-7 gap-y-2 py-5 text-xs text-brand-ink/55 sm:justify-start sm:pl-10 md:pl-16"
        >
          <div className="flex items-center gap-1.5">
            <MapPin size={14} className="text-brand-red" />
            <dd>Yeenua Street, near UEW</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock3 size={14} className="text-brand-red" />
            <dd>11am – 9pm daily</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Truck size={14} className="text-brand-red" />
            <dd>Pickup &amp; delivery</dd>
          </div>
        </motion.dl>
      </section>

      {/* Marquee */}
      <div className="relative overflow-hidden border-y border-brand-ink/10 bg-brand-red py-2.5">
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

      {/* Menu — a centered title over a plain product grid: real cup photos
          in light cards, a star row, name, price and a pill order button
          alternating red/gold, instead of full-bleed dark photo tiles. */}
      <section id="menu" className="px-4 py-14 sm:px-6 sm:py-20 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4 }}
          className="mx-auto max-w-lg text-center"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-brand-red-700">The menu</p>
          <h2 className="mt-1.5 font-display text-2xl uppercase tracking-tight sm:text-3xl">Browse our favorites</h2>
          <p className="mt-2 text-sm text-brand-ink/55">Made fresh at our counter — every cup, every order.</p>
        </motion.div>

        <div className="mx-auto mt-9 grid max-w-6xl grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-7">
          {dishes.map((dish, index) => (
            <MotionLink
              key={dish.id}
              href={`/order?dish=${dish.id}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: (index % 4) * 0.07, duration: 0.4, ease: [0.34, 1.2, 0.64, 1] }}
              className="group flex flex-col items-center text-center"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_rgba(74,42,20,0.08)]">
                <Image
                  src={dish.photo}
                  alt={dish.name}
                  fill
                  sizes="(min-width: 640px) 220px, 45vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  style={{ objectPosition: dish.photoPosition }}
                />
                {dish.tag && (
                  <span className="absolute left-2.5 top-2.5 rounded bg-brand-gold px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-brand-ink shadow">
                    {dish.tag}
                  </span>
                )}
              </div>

              <div className="mt-3 flex gap-0.5 text-brand-gold">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={11} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="mt-1 text-sm font-semibold text-brand-ink">{dish.name}</p>
              <p className="text-sm font-bold text-brand-ink">{formatPrice(dish.price)}</p>

              <span
                className={`mt-2 rounded-full px-5 py-1.5 font-display text-[11px] uppercase tracking-wide text-white shadow transition-transform group-hover:scale-105 ${
                  index % 2 ? "bg-brand-gold text-brand-ink" : "bg-brand-red"
                }`}
              >
                Add to cart
              </span>
            </MotionLink>
          ))}
        </div>
      </section>

      {/* Behind the counter — the page's one deliberately dark section, the
          same "bold contrast card in an otherwise light page" move the
          reference layout uses for its own voucher/offer panel. */}
      <section className="px-4 pb-14 sm:px-6 sm:pb-20 md:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] bg-brand-ink px-6 py-10 sm:rounded-[2.25rem] sm:px-12 sm:py-14">
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

      {/* Visit */}
      <section id="visit" className="px-4 pb-14 sm:px-6 sm:pb-20 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-[1.75rem] sm:rounded-[2.25rem]">
            <div className="relative h-56 sm:h-72">
              <Image
                src="/images/boba/interior-hangout.jpg"
                alt="Customers hanging out inside the Boba King Winneba store"
                fill
                sizes="(min-width: 1024px) 1120px, 100vw"
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

            <div className="space-y-3 bg-white p-5 sm:p-6">
              {rankedBranches.map((branch, index) => (
                <motion.div
                  key={branch.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: index * 0.06, duration: 0.35 }}
                  className="flex flex-col gap-4 rounded-2xl border border-brand-ink/10 bg-brand-cream/60 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
                      <MapPin size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-brand-ink">{branch.name}</p>
                        {branch.id === closestId && (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-red/10 px-2 py-0.5 text-[10px] font-semibold text-brand-red-700">
                            <Navigation size={9} /> Nearest to you
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-brand-ink/50">
                        {branch.address}
                        {branch.distanceKm != null && ` · ${branch.distanceKm.toFixed(1)} km away`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-brand-ink/60 sm:justify-end">
                    <span className="flex items-center gap-1.5">
                      <Clock3 size={13} className="text-brand-red" /> 11am – 9pm daily
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MessageCircle size={13} className="text-brand-red" /> 0593 422 400
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 bg-brand-ink px-4 py-8 text-brand-cream sm:px-6 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
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
