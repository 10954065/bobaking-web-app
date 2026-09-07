import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-stone-950 px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">Flicks &amp; Licks</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-semibold text-stone-50 sm:text-5xl">
        The restaurant operating system is under construction.
      </h1>
      <p className="mt-4 max-w-lg text-stone-400">
        Online ordering for Mile 7, Achimota, East Legon, and Dansoman is coming soon.
      </p>
      <Link
        href="/login"
        className="mt-8 rounded-lg bg-orange-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-orange-500"
      >
        Staff sign in
      </Link>
    </div>
  );
}
