"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogoWordmark } from "@/components/brand/Logo";

const SESSION_KEY = "flicks-splash-shown";

/**
 * Choreography timeline (ms from mount) for the full first-visit splash.
 * The wordmark blur-in -> crisp -> "&" pop -> droplet pop sequence
 * reconstructs the brand's original ~1.57s logo-reveal clip at close to its
 * native speed; everything from `glow` onward is the cinematic extension
 * (settle, ambient hold) built around that core. Durations/easing live in
 * globals.css (.splash-*) — this object only owns the schedule.
 */
const TIMINGS = {
  flood: 400,
  wordmark: 650,
  ampersand: 1350,
  dropletBase: 1650,
  dropletStagger: 90,
  glow: 2450,
  tagline: 2650,
  min: 5000,
  max: 7000,
};

/** Simplified schedule for prefers-reduced-motion: a plain fade hold, no
 * blur/scale/staggered choreography — see globals.css usage below. */
const REDUCED_TIMINGS = { min: 550, max: 1600, exit: 320 };

const DROPLETS = [
  { top: "-14%", left: "8%", size: "0.16em" },
  { top: "-26%", left: "44%", size: "0.24em" },
  { top: "-10%", left: "90%", size: "0.18em" },
];

/**
 * Exit choreography — triggered by React state (not a mount-relative delay
 * like the entrance), so it's built with Framer variants instead of the CSS
 * .splash-* classes. White bubbles spring-bloom outward from the mark to
 * cover the screen, then the whole overlay fades away to reveal the app
 * underneath — the bubbles are what "hand off" to the homepage, not a plain
 * cut. Sized in vmax so they scale with viewport regardless of aspect ratio.
 */
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

/** Waits for the splash's own display font so the mark never hands off to
 * the app mid-swap; falls back to a short timeout if the Font Loading API
 * is unavailable or hangs. */
function useFontsReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) {
      setReady(true);
      return;
    }
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) setReady(true);
    });
    const fallback = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 2200);
    return () => {
      cancelled = true;
      clearTimeout(fallback);
    };
  }, []);
  return ready;
}

export function SplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const isReady = useFontsReady();
  const isReadyRef = useRef(isReady);

  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  // First visit this session only — returning navigation back to "/" skips
  // the splash entirely rather than replaying it.
  useEffect(() => {
    setMounted(true);
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(true);
  }, []);

  // Readiness gate: never exit before `min` has played, never hold past
  // `max` regardless of readiness, exit as soon as both are satisfied.
  useEffect(() => {
    if (!visible) return;
    const timings = reducedMotion ? REDUCED_TIMINGS : TIMINGS;
    const start = performance.now();
    let timer: ReturnType<typeof setTimeout>;

    const check = () => {
      const elapsed = performance.now() - start;
      if ((elapsed >= timings.min && isReadyRef.current) || elapsed >= timings.max) {
        setVisible(false);
        return;
      }
      timer = setTimeout(check, 120);
    };
    timer = setTimeout(check, timings.min);
    return () => clearTimeout(timer);
  }, [visible, reducedMotion]);

  // Keyboard escape hatch — the overlay never traps focus (nothing calls
  // .focus() or renders a focus trap), so this only shortens the wait.
  useEffect(() => {
    if (!visible) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setVisible(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [visible]);

  // Nothing to render server-side or before the sessionStorage check runs —
  // avoids a flash of the splash on every client navigation back to "/".
  if (!mounted) return null;

  // Reduced motion exits with a plain fade; the full version delays its own
  // fade until the bubble bloom below has mostly covered the screen.
  const outerExitTransition = reducedMotion
    ? { duration: REDUCED_TIMINGS.exit / 1000, ease: "easeInOut" as const }
    : { duration: EXIT_FADE_DURATION, ease: "easeInOut" as const, delay: EXIT_FADE_DELAY };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={false}
          exit={{ opacity: 0 }}
          transition={outerExitTransition}
          onClick={() => setVisible(false)}
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
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.5em] text-brand-cyan">The Suya Boss</p>
            </motion.div>
          ) : (
            <>
              <div aria-hidden className="splash-flood absolute inset-0 bg-brand-red" style={{ animationDelay: `${TIMINGS.flood}ms` }} />

              <div
                aria-hidden
                className="splash-glow pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-cream/30 blur-[100px]"
                style={{ animationDelay: `${TIMINGS.glow}ms, 0ms` }}
              />

              <motion.div
                exit={{ scale: 1.12, filter: "blur(20px)", opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 1, 1] }}
                className="relative flex flex-col items-center px-6 text-center"
              >
                <div className="relative text-[clamp(2.75rem,6vw+1.25rem,5.5rem)]">
                  <LogoWordmark
                    animateReveal
                    style={{ animationDelay: `${TIMINGS.wordmark}ms` }}
                    ampersandStyle={{ animationDelay: `${TIMINGS.ampersand}ms` }}
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
                        animationDelay: `${TIMINGS.dropletBase + index * TIMINGS.dropletStagger}ms`,
                      }}
                    />
                  ))}
                </div>

                <p
                  className="splash-tagline-reveal mt-6 text-xs font-semibold uppercase tracking-[0.5em] text-brand-cyan"
                  style={{ animationDelay: `${TIMINGS.tagline}ms` }}
                >
                  The Suya Boss
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
