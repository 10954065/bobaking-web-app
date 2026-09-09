import type { CSSProperties } from "react";
import Image from "next/image";

type LogoProps = {
  /** Edge length in pixels. */
  size?: number;
  /** Show the thin cyan ring used on the circular social-profile variant of the mark. */
  ring?: boolean;
  className?: string;
};

type LogoWordmarkProps = {
  /** Fixed pixel size, matching the badge usage below. Omit for a responsive
   * "hero" size instead, inherited from the wrapping element's font-size —
   * used by the splash screen, which sets its own clamp() there. */
  size?: number;
  className?: string;
  /** Blur the wordmark in and pop the "&" a beat later instead of rendering
   * fully formed — used only by the splash screen's first-visit intro. */
  animateReveal?: boolean;
  style?: CSSProperties;
  ampersandStyle?: CSSProperties;
};

/**
 * The hand-lettered "Flicks Licks&" wordmark on its own, with no badge card
 * around it — for contexts (the splash) that place the mark directly on a
 * brand-red field rather than inside the rounded-square logo badge.
 */
export function LogoWordmark({ size, className = "", animateReveal = false, style, ampersandStyle }: LogoWordmarkProps) {
  const lineStyle = size != null ? { fontSize: size * 0.26 } : undefined;
  return (
    <span
      className={`flex flex-col items-start justify-center text-brand-cream ${animateReveal ? "splash-wordmark-reveal" : ""} ${className}`}
      style={{ fontFamily: "var(--font-marker)", fontWeight: 800, lineHeight: 0.92, ...style }}
    >
      <span style={lineStyle}>Flicks</span>
      <span style={size != null ? { fontSize: size * 0.26, marginTop: size * 0.03 } : { marginTop: "0.12em" }}>
        Licks
        <span className={`text-[0.6em] align-top ${animateReveal ? "splash-ampersand-pop" : ""}`} style={animateReveal ? ampersandStyle : undefined}>
          &amp;
        </span>
      </span>
    </span>
  );
}

/**
 * The Flicks & Licks mark — the real brand logo artwork (provided directly
 * by the business, see public/brand/logo.png), rendered as a rounded-square
 * badge. Used everywhere the site needs the "actual" logo rather than the
 * CSS-animated wordmark reconstruction (LogoWordmark), which exists solely
 * for the splash screen's letter-by-letter reveal animation.
 */
export function Logo({ size = 56, ring = false, className = "" }: LogoProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden bg-brand-red shadow-lg shadow-brand-red/25 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        boxShadow: ring ? `0 0 0 ${Math.max(2, size * 0.035)}px var(--color-brand-cyan), 0 10px 24px -8px rgba(228,35,19,0.55)` : undefined,
      }}
    >
      <Image src="/brand/logo.png" alt="Flicks & Licks" width={size} height={size} className="h-full w-full object-cover" />
    </span>
  );
}

/** Horizontal lockup — badge plus a wordmark, for headers/nav bars. */
export function LogoLockup({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Logo size={size} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[0.95em] uppercase tracking-wide text-brand-cream" style={{ fontSize: size * 0.34 }}>
          Flicks &amp; Licks
        </span>
        <span className="text-[0.6em] font-semibold uppercase tracking-[0.3em] text-brand-cyan" style={{ fontSize: size * 0.19 }}>
          The Suya Boss
        </span>
      </span>
    </span>
  );
}
