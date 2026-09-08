import { UtensilsCrossed } from "lucide-react";

const FALLBACK_PALETTE = [
  "bg-brand-red-500/15 text-brand-red-400",
  "bg-rose-500/15 text-rose-400",
  "bg-amber-500/15 text-amber-400",
  "bg-emerald-500/15 text-emerald-400",
  "bg-sky-500/15 text-sky-400",
  "bg-violet-500/15 text-violet-400",
];

/** Deterministic so the same dish always gets the same fallback color, not a random one on every render. */
function paletteFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length]!;
}

/**
 * A dish photo when the product has one, otherwise a deterministic colored
 * placeholder tile — never a broken image or an empty gray box. Sizing is
 * entirely up to the parent via `className` (expects an element with
 * explicit width/height, e.g. `aspect-square`).
 */
export function MenuImage({ src, alt, className = "" }: { src: string | null; alt: string; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- product photos are arbitrary external/uploaded URLs, not part of the app's own optimized asset set.
    return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
  }

  return (
    <div className={`flex items-center justify-center ${paletteFor(alt)} ${className}`}>
      <UtensilsCrossed size="38%" strokeWidth={1.5} />
    </div>
  );
}
