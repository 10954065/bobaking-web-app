"use client";

import { useEffect, useRef, useState } from "react";
import { SplashVisual, useReducedMotionPreference, type SplashEntranceTimings } from "@/components/brand/SplashVisual";

const SESSION_KEY = "boba-king-splash-shown";

/**
 * Choreography timeline (ms from mount) for the full first-visit splash.
 * The wordmark blur-in -> crisp -> "&" pop -> droplet pop sequence
 * reconstructs the brand's original ~1.57s logo-reveal clip at close to its
 * native speed; everything from `glow` onward is the cinematic extension
 * (settle, ambient hold) built around that core. Durations/easing live in
 * globals.css (.splash-*) — this object only owns the schedule.
 */
const TIMINGS: SplashEntranceTimings = {
  flood: 400,
  wordmark: 650,
  ampersand: 1350,
  dropletBase: 1650,
  dropletStagger: 90,
  glow: 2450,
  tagline: 2650,
};

const MIN_DURATION_MS = 5000;
const MAX_DURATION_MS = 7000;
const REDUCED_MIN_MS = 550;
const REDUCED_MAX_MS = 1600;

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
  const reducedMotion = useReducedMotionPreference();
  const isReady = useFontsReady();
  const isReadyRef = useRef(isReady);

  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  // First visit this session only — returning navigation back to "/" skips
  // the splash entirely rather than replaying it.
  useEffect(() => {
    setMounted(true);
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(true);
  }, []);

  // Readiness gate: never exit before `min` has played, never hold past
  // `max` regardless of readiness, exit as soon as both are satisfied.
  useEffect(() => {
    if (!visible) return;
    const min = reducedMotion ? REDUCED_MIN_MS : MIN_DURATION_MS;
    const max = reducedMotion ? REDUCED_MAX_MS : MAX_DURATION_MS;
    const start = performance.now();
    let timer: ReturnType<typeof setTimeout>;

    const check = () => {
      const elapsed = performance.now() - start;
      if ((elapsed >= min && isReadyRef.current) || elapsed >= max) {
        setVisible(false);
        return;
      }
      timer = setTimeout(check, 120);
    };
    timer = setTimeout(check, min);
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

  return <SplashVisual visible={visible} reducedMotion={reducedMotion} timings={TIMINGS} onSkip={() => setVisible(false)} />;
}
