"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { MapPin } from "lucide-react";
import { Logo, LogoLockup } from "@/components/brand/Logo";

type Branch = { id: string; name: string; address: string };

const DISHES = [
  { name: "Loaded Fries with Cheese", price: "GH₵135", image: "/images/menu/loaded-fries-cheese.jpg", tag: "Popular" },
  { name: "Fully Loaded Shawarma", price: "GH₵95", image: "/images/menu/fully-loaded-shawarma.jpg", tag: "Popular" },
  { name: "Flicks Special Pizza", price: "GH₵140", image: "/images/menu/flicks-special-pizza.jpg" },
  { name: "Chicken Suya", price: "GH₵60", image: "/images/menu/chicken-suya.jpg" },
  { name: "Flicks & Licks Combo", price: "GH₵290", image: "/images/menu/flicks-licks-combo.jpg" },
  { name: "Super Loaded (Plantain+)", price: "GH₵170", image: "/images/menu/super-loaded-plantain.jpg", tag: "Popular" },
  { name: "Assorted Jollof", price: "GH₵120", image: "/images/menu/assorted-jollof.png" },
  { name: "Cheesy Shawarma", price: "GH₵120", image: "/images/menu/cheesy-shawarma.jpg" },
];

const MARQUEE_ITEMS = ["MILE 7 T-JUNCTION", "ACHIMOTA", "EAST LEGON", "DANSOMAN", "THE SUYA BOSS", "OPEN DAILY 10AM – 11PM"];

export function HomePage({ branches }: { branches: Branch[] }) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-ink text-brand-cream">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-brand-ink/90 px-5 py-3.5 backdrop-blur">
        <LogoLockup size={38} />
        <Link
          href="/order"
          className="rounded-full bg-brand-red px-5 py-2 font-display text-xs uppercase tracking-wide text-white shadow-lg shadow-brand-red/25"
        >
          Order now
        </Link>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden px-5 pb-10 pt-12 sm:pt-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-brand-red/25 blur-[110px]"
        />

        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2 lg:items-center lg:gap-6">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
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
              className="mt-3 font-display text-[2.6rem] uppercase leading-[0.95] tracking-tight sm:text-6xl"
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
              <Image src="/images/menu/chicken-suya.jpg" alt="Chicken Suya" fill sizes="200px" className="object-cover" />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-2xl">
              <Image src="/images/menu/loaded-fries-cheese.jpg" alt="Loaded Fries with Cheese" fill sizes="200px" className="object-cover" />
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

      {/* Fan favorites — real menu, real photos */}
      <section className="px-5 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4 }}
            className="flex items-end justify-between"
          >
            <h2 className="font-display text-2xl uppercase tracking-tight text-brand-cream sm:text-3xl">Fan favorites</h2>
            <Link href="/order" className="text-xs font-semibold uppercase tracking-widest text-brand-cyan">
              Full menu
            </Link>
          </motion.div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DISHES.map((dish, index) => (
              <motion.div
                key={dish.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: (index % 4) * 0.08, duration: 0.4 }}
                whileHover={{ y: -4 }}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
              >
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={dish.image}
                    alt={dish.name}
                    fill
                    sizes="(min-width: 640px) 220px, 45vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {dish.tag && (
                    <span className="absolute left-2 top-2 rounded-full bg-brand-red px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                      {dish.tag}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-brand-cream">{dish.name}</p>
                  <p className="mt-0.5 text-xs font-semibold text-brand-cyan">{dish.price}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Branches */}
      <section className="px-5 pb-14 sm:pb-20">
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
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {branches.map((branch, index) => (
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
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-brand-cream">{branch.name}</p>
                  <p className="truncate text-xs text-brand-cream/50">{branch.address}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 px-5 py-8">
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
