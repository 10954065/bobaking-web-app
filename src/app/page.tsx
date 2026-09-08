import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-stone-950 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-900/30">
        <UtensilsCrossed size={26} strokeWidth={2.25} />
      </span>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">Flicks &amp; Licks</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-semibold text-stone-50 sm:text-5xl">Order online, we&apos;ll take it from there.</h1>
      <p className="mt-4 max-w-lg text-stone-400">
        Delivery or pickup from Mile 7, Achimota, East Legon, and Dansoman — pick a branch and see the menu.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/order"
          className="rounded-lg bg-orange-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-orange-500"
        >
          Order now
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-stone-700 px-6 py-2.5 font-semibold text-stone-300 transition-colors hover:bg-stone-900"
        >
          Staff sign in
        </Link>
      </div>
    </div>
  );
}
