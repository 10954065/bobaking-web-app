import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata = {
  title: "Page not found | Flicks & Licks",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-ink px-6 py-16 text-center">
      <Logo size={56} className="mb-8" />

      <p className="font-display text-[clamp(4rem,14vw,9rem)] leading-none text-brand-red">404</p>

      <h1 className="mt-3 font-display text-2xl uppercase tracking-wide text-brand-cream sm:text-3xl">
        Nothing cooking here.
      </h1>
      <p className="mt-3 max-w-sm text-sm text-brand-cream/60">
        That page has been eaten, moved, or never existed in the first place. Let&apos;s get you back to the menu.
      </p>

      <Link
        href="/"
        className="mt-8 rounded-full bg-brand-red px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-red/25 transition-transform hover:scale-[1.03] active:scale-[0.98]"
      >
        Take me home
      </Link>
    </div>
  );
}
