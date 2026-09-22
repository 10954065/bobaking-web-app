"use client";

import { useId } from "react";

type BobaCupProps = {
  size?: number;
  /** CSS color value for the drink itself — pick from the existing brand tokens, not an arbitrary hue. */
  liquidColor: string;
  fillLevel?: number;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * The brand's one custom illustrated mark: a tapered cup with a dome lid,
 * angled straw and settled tapioca pearls. Recolored per menu category via
 * `liquidColor` (always one of the existing brand tokens) rather than a
 * different hue per flavor, so the menu reads as one system, not a rainbow.
 * Used in place of a stock icon or a missing product photo everywhere the
 * app needs to represent "a drink" — hero, menu cards, empty states.
 */
export function BobaCup({ size = 96, liquidColor, fillLevel = 0.72, className = "", style }: BobaCupProps) {
  const clipId = useId();
  const top = 40;
  const bottom = 132;
  const liquidTop = bottom - fillLevel * (bottom - top);
  const cupPath = "M26 40 L74 40 L66 122 Q65 132 55 132 L45 132 Q35 132 34 122 Z";

  const pearls = [
    { cx: 43, cy: 121, r: 3.4 },
    { cx: 50, cy: 125, r: 4 },
    { cx: 57, cy: 120, r: 3.2 },
    { cx: 47, cy: 115, r: 3.6 },
    { cx: 54, cy: 113, r: 3 },
    { cx: 41, cy: 111, r: 2.6 },
    { cx: 60, cy: 114, r: 2.8 },
  ];

  return (
    <svg viewBox="0 0 100 140" width={size} height={(size * 140) / 100} className={className} style={style} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <path d={cupPath} />
        </clipPath>
      </defs>

      <path d={cupPath} fill="var(--color-brand-cream)" opacity={0.08} />

      <g clipPath={`url(#${clipId})`}>
        <rect x={20} y={liquidTop} width={60} height={bottom - liquidTop + 6} fill={liquidColor} />
        <rect x={30} y={liquidTop} width={6} height={bottom - liquidTop + 6} fill="white" opacity={0.12} />
        {pearls.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="var(--color-brand-ink)" opacity={0.85} />
        ))}
      </g>

      <path d={cupPath} fill="none" stroke="var(--color-brand-cream)" strokeOpacity={0.35} strokeWidth={1.5} />

      <ellipse cx={50} cy={40} rx={28} ry={6} fill="var(--color-brand-cream)" opacity={0.9} />
      <ellipse cx={50} cy={40} rx={28} ry={6} fill="none" stroke="var(--color-brand-ink)" strokeOpacity={0.2} strokeWidth={1} />

      <rect x={0} y={0} width={7} height={72} rx={3.5} fill="var(--color-brand-cream)" opacity={0.95} transform="translate(58 4) rotate(-11)" />
    </svg>
  );
}

type WaffleGlyphProps = { size?: number; className?: string; style?: React.CSSProperties };

/** Companion glyph for the non-drink menu items (waffles), sharing the same
 * flat, restrained visual language as BobaCup — same stroke weight, same
 * palette family — so the menu grid reads as one illustrated system. */
export function WaffleGlyph({ size = 96, className = "", style }: WaffleGlyphProps) {
  const lines = [26, 37, 48, 59, 70];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={style} aria-hidden="true">
      <rect x={15} y={15} width={70} height={70} rx={12} fill="var(--color-brand-cream)" opacity={0.14} />
      <rect x={15} y={15} width={70} height={70} rx={12} fill="none" stroke="var(--color-brand-cream)" strokeOpacity={0.35} strokeWidth={1.5} />
      <g stroke="var(--color-brand-cream)" strokeOpacity={0.22} strokeWidth={1.2}>
        {lines.map((v) => (
          <line key={`v${v}`} x1={v} y1={19} x2={v} y2={81} />
        ))}
        {lines.map((h) => (
          <line key={`h${h}`} x1={19} y1={h} x2={81} y2={h} />
        ))}
      </g>
      <circle cx={64} cy={32} r={8} fill="var(--color-brand-gold)" opacity={0.9} />
      <circle cx={57} cy={44} r={3.2} fill="var(--color-brand-gold)" opacity={0.75} />
      <circle cx={68} cy={46} r={2.4} fill="var(--color-brand-gold)" opacity={0.6} />
    </svg>
  );
}

/** Maps a product name to a glyph + tone drawn only from the existing brand
 * tokens (cyan, gold, and the red/terracotta ramp) — flavors read as tonal
 * variation within one palette, never a new hue per item. */
export function DishGlyph({ name, size = 96, className = "" }: { name: string; size?: number; className?: string }) {
  const n = name.toLowerCase();
  if (n.includes("waffle") && !n.includes("combo")) return <WaffleGlyph size={size} className={className} />;

  const tone = n.includes("matcha")
    ? "var(--color-brand-cyan)"
    : n.includes("blueberry")
      ? "var(--color-brand-cyan)"
      : n.includes("brown sugar")
        ? "var(--color-brand-red-700)"
        : n.includes("taro")
          ? "var(--color-brand-red-400)"
          : n.includes("strawberry")
            ? "var(--color-brand-red-300)"
            : n.includes("mango") || n.includes("caramel") || n.includes("biscoff")
              ? "var(--color-brand-gold)"
              : "var(--color-brand-red)";

  return <BobaCup size={size} liquidColor={tone} className={className} />;
}
