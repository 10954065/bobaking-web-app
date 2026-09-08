type LogoProps = {
  /** Edge length in pixels. */
  size?: number;
  /** Show the thin cyan ring used on the circular social-profile variant of the mark. */
  ring?: boolean;
  className?: string;
};

/**
 * The Flicks & Licks mark — a rounded-square red badge with the hand-lettered
 * cream wordmark, matched against the brand's real logo (provided directly
 * by the business) as a scalable component rather than a rasterized copy.
 */
export function Logo({ size = 56, ring = false, className = "" }: LogoProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center bg-brand-red shadow-lg shadow-brand-red/25 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        boxShadow: ring ? `0 0 0 ${Math.max(2, size * 0.035)}px var(--color-brand-cyan), 0 10px 24px -8px rgba(228,35,19,0.55)` : undefined,
      }}
    >
      <span
        className="flex flex-col items-start justify-center text-brand-cream"
        style={{ fontFamily: "var(--font-marker)", fontWeight: 800, lineHeight: 0.92, paddingLeft: size * 0.16 }}
      >
        <span style={{ fontSize: size * 0.26 }}>Flicks</span>
        <span style={{ fontSize: size * 0.26, marginTop: size * 0.03 }}>
          Licks<span className="text-[0.6em] align-top">&amp;</span>
        </span>
      </span>
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
