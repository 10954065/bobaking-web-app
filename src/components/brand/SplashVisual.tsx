"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogoWordmark } from "@/components/brand/Logo";

/** Entrance schedule (ms from when `visible` turns true) for the mark's
 * blur-in -> "&" pop -> droplet pop -> settle sequence. Exit (the white
 * bubble bloom) is fixed and shared by every caller — see EXIT_* below. */
export type SplashEntranceTimings = {
  flood: number;
  wordmark: number;
  ampersand: number;
  dropletBase: number;
  dropletStagger: number;
  glow: number;
  tagline: number;
};

const DROPLETS = [
  { top: "-14%", left: "8%", size: "0.16em" },
  { top: "-26%", left: "44%", size: "0.24em" },
  { top: "-10%", left: "90%", size: "0.18em" },
];

const EXIT_BUBBLES = [
  { top: "50%", left: "50%", size: "72vmax" },
  { top: "26%", left: "22%", size: "42vmax" },
  { top: "74%", left: "18%", size: "46vmax" },
  { top: "20%", left: "80%", size: "44vmax" },
  { top: "82%", left: "78%", size: "48vmax" },
];
const EXIT_BUBBLE_STAGGER = 0.06;
const EXIT_FADE_DELAY = 0.6;
const EXIT_FADE_DURATION = 0.45;

/** How long after `visible` turns false the bubbles have bloomed enough to
 * fully cover the screen — a caller that swaps its own content mid-transition
 * (the checkout hand-off) should do so at roughly this point. */
export const EXIT_BLOOM_COVER_MS = 420;

export function useReducedMotionPreference(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/**
 * The animated brand mark shared by the homepage's first-visit splash
 * (SplashScreen.tsx) and the storefront's checkout hand-off — a controlled,
 * presentational overlay driven entirely by `visible`, with no timers of its
 * own beyond the entrance's CSS animation-delays. Callers own the schedule:
 * when to flip `visible` back to false, and (if they swap their own content
 * mid-transition) when to do it relative to EXIT_BLOOM_COVER_MS.
 */
export function SplashVisual({
  visible,
  reducedMotion,
  timings,
  tagline = "The Suya Boss",
  onSkip,
}: {
  visible: boolean;
  reducedMotion: boolean;
  timings: SplashEntranceTimings;
  tagline?: string;
  onSkip?: () => void;
}) {
  const exitTransition = reducedMotion
    ? { duration: 0.3, ease: "easeInOut" as const }
    : { duration: EXIT_FADE_DURATION, ease: "easeInOut" as const, delay: EXIT_FADE_DELAY };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={false}
          exit={{ opacity: 0 }}
          transition={exitTransition}
          onClick={onSkip}
          aria-hidden="true"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-brand-ink"
        >
          {reducedMotion ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-brand-red px-6 text-center"
            >
              <LogoWordmark size={96} />
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.5em] text-brand-cyan">{tagline}</p>
            </motion.div>
          ) : (
            <>
              <div aria-hidden className="splash-flood absolute inset-0 bg-brand-red" style={{ animationDelay: `${timings.flood}ms` }} />

              <div
                aria-hidden
                className="splash-glow pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-cream/30 blur-[100px]"
                style={{ animationDelay: `${timings.glow}ms, 0ms` }}
              />

              <motion.div
                exit={{ scale: 1.12, filter: "blur(20px)", opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 1, 1] }}
                className="relative flex flex-col items-center px-6 text-center"
              >
                <div className="relative text-[clamp(2.75rem,6vw+1.25rem,5.5rem)]">
                  <LogoWordmark
                    animateReveal
                    style={{ animationDelay: `${timings.wordmark}ms` }}
                    ampersandStyle={{ animationDelay: `${timings.ampersand}ms` }}
                  />
                  {DROPLETS.map((drop, index) => (
                    <span
                      key={index}
                      aria-hidden
                      className="splash-droplet absolute rounded-full bg-brand-cream"
                      style={{
                        top: drop.top,
                        left: drop.left,
                        width: drop.size,
                        height: drop.size,
                        animationDelay: `${timings.dropletBase + index * timings.dropletStagger}ms`,
                      }}
                    />
                  ))}
                </div>

                <p
                  className="splash-tagline-reveal mt-6 text-xs font-semibold uppercase tracking-[0.5em] text-brand-cyan"
                  style={{ animationDelay: `${timings.tagline}ms` }}
                >
                  {tagline}
                </p>
              </motion.div>

              {EXIT_BUBBLES.map((bubble, index) => (
                <motion.div
                  key={index}
                  aria-hidden
                  className="pointer-events-none absolute rounded-full bg-white"
                  style={{ top: bubble.top, left: bubble.left, width: bubble.size, height: bubble.size, x: "-50%", y: "-50%" }}
                  initial={{ scale: 0, opacity: 0 }}
                  exit={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", bounce: 0.55, visualDuration: 0.55, delay: index * EXIT_BUBBLE_STAGGER }}
                />
              ))}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
