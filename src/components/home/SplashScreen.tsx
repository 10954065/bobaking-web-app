"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Logo } from "@/components/brand/Logo";

const SESSION_KEY = "flicks-splash-shown";
const DISPLAY_MS = 1700;

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alreadyShown = sessionStorage.getItem(SESSION_KEY) === "1";
    if (reducedMotion || alreadyShown) return;

    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Nothing to render server-side or before the sessionStorage check runs —
  // avoids a flash of the splash on every client navigation back to "/".
  if (!mounted) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          onClick={() => setVisible(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-ink"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-red/25 blur-[100px]"
          />
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative flex flex-col items-center"
          >
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ delay: 0.55, duration: 0.6, ease: "easeInOut" }}
            >
              <Logo size={104} />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="mt-5 text-xs font-semibold uppercase tracking-[0.5em] text-brand-cyan"
            >
              Flicks &amp; Licks
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
