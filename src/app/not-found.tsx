import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata = {
  title: "Page not found | Boba King",
};

export default function NotFound() {
  return (
    <div className="bg-dotted flex min-h-screen flex-col items-center justify-center bg-brand-cream px-6 py-16 text-center">
      <Logo size={56} className="mb-8 shadow-xl" />

      <p className="relative z-10 font-display text-[clamp(4.5rem,16vw,10rem)] leading-none text-brand-red">404</p>

      <h1 className="mt-3 font-display text-2xl uppercase tracking-wide text-brand-ink sm:text-3xl">Nothing cooking here.</h1>
      <p className="mt-3 max-w-sm text-sm text-brand-ink/60">
        That page has been sipped dry, moved, or never existed in the first place. Let&apos;s get you back to the counter.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-brand-red px-6 py-3 font-display text-sm uppercase tracking-wide text-white shadow-lg shadow-brand-red/25 transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          Take me home
        </Link>
        <Link
          href="/order"
          className="rounded-full border border-brand-ink/15 bg-white px-6 py-3 font-display text-sm uppercase tracking-wide text-brand-ink/75 transition-colors hover:border-brand-ink/30 hover:text-brand-ink"
        >
          See the menu
        </Link>
      </div>

      <div className="mt-14 w-36 -rotate-3 overflow-hidden rounded-xl border-4 border-white shadow-2xl transition-transform hover:rotate-0 sm:w-44">
        <div className="relative aspect-4/5">
          <Image
            src="/images/boba/waffle-aesthetic.jpg"
            alt="Fresh drinks and a waffle at the Boba King counter"
            fill
            sizes="180px"
            className="object-cover"
            style={{ objectPosition: "30% 75%" }}
          />
        </div>
        <p className="bg-white px-2 py-1.5 text-center font-display text-[10px] uppercase tracking-wide text-brand-ink">
          Still here, though
        </p>
      </div>
    </div>
  );
}
