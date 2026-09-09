"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { pingLocationAction } from "@/modules/delivery/actions/rider.actions";
import { distanceMeters, isAcceptableAccuracy } from "@/modules/delivery/services/geo-validation";

export type GpsStatus = "idle" | "requesting" | "active" | "denied" | "unavailable" | "error";

export interface RiderLocationFix {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
}

export interface RiderLocationTrackerState {
  status: GpsStatus;
  lastFix: RiderLocationFix | null;
  lastSubmittedAt: number | null;
  isOnline: boolean;
  errorMessage: string | null;
}

// Phase 4's three thresholds. Together they mean: submit at most once every
// MIN_PING_INTERVAL_MS, but always submit at least once every
// MAX_PING_INTERVAL_MS even while stationary (so the customer's "last
// updated" doesn't go stale at a red light), and in between only submit if
// the rider actually moved a meaningful distance.
const MIN_PING_INTERVAL_MS = 5_000;
const MAX_PING_INTERVAL_MS = 15_000;
const MIN_MOVEMENT_METERS = 15;

function subscribeToOnlineStatus(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function shouldSubmit(
  last: { fix: RiderLocationFix; at: number } | null,
  next: RiderLocationFix,
  now: number
): boolean {
  if (!last) return true;
  const elapsed = now - last.at;
  if (elapsed < MIN_PING_INTERVAL_MS) return false;
  if (elapsed >= MAX_PING_INTERVAL_MS) return true;
  return distanceMeters(last.fix, next) >= MIN_MOVEMENT_METERS;
}

/**
 * Owns the rider's GPS watch end-to-end: requests permission, throttles
 * submissions by time+movement+accuracy thresholds (so a phone reporting a
 * fix every second doesn't turn into a network request every second), and
 * keeps only the single latest fix to send once connectivity returns rather
 * than queuing a backlog while offline. Submission itself (validation,
 * authorization, rate limiting) is server-side — see
 * rider.actions.ts#pingLocationAction — this hook only decides *when* to call it.
 */
export function useRiderLocationTracker(enabled: boolean): RiderLocationTrackerState {
  const [status, setStatus] = useState<GpsStatus>(() => (enabled ? "requesting" : "idle"));
  const [lastFix, setLastFix] = useState<RiderLocationFix | null>(null);
  const [lastSubmittedAt, setLastSubmittedAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // navigator.onLine read via useSyncExternalStore (not useState+effect) —
  // this is exactly the pattern React recommends for subscribing to a
  // browser API: getServerSnapshot returns true so SSR/hydration never
  // mismatches on a client that happens to be offline at load.
  const isOnline = useSyncExternalStore(
    subscribeToOnlineStatus,
    () => navigator.onLine,
    () => true
  );

  const lastSubmittedRef = useRef<{ fix: RiderLocationFix; at: number } | null>(null);
  const pendingWhileOfflineRef = useRef<{ fix: RiderLocationFix; timestamp: number } | null>(null);
  const isOnlineRef = useRef(isOnline);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  // Flushes the single pending fix (if any) the instant connectivity
  // returns — a side effect (send a request), not a state sync, so it's
  // kept separate from the useSyncExternalStore subscription above.
  useEffect(() => {
    function handleOnline() {
      const pending = pendingWhileOfflineRef.current;
      if (pending) {
        pendingWhileOfflineRef.current = null;
        submit(pending.fix, pending.timestamp);
      }
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // Reacts to `enabled` toggling — adjusted during render rather than as
  // the first statement of the watch-setup effect below, so flipping to
  // "idle"/"requesting" doesn't itself count as a leading effect setState.
  const [lastEnabled, setLastEnabled] = useState(enabled);
  if (enabled !== lastEnabled) {
    setLastEnabled(enabled);
    setStatus(enabled ? "requesting" : "idle");
    if (!enabled) setErrorMessage(null);
  }

  function submit(fix: RiderLocationFix, timestamp: number) {
    lastSubmittedRef.current = { fix, at: Date.now() };
    setLastSubmittedAt(Date.now());
    pingLocationAction({
      latitude: fix.latitude,
      longitude: fix.longitude,
      heading: fix.heading,
      speed: fix.speed,
      accuracy: fix.accuracy,
      timestamp,
    }).catch(() => {
      // A dropped ping is not fatal — the next accepted fix supersedes it.
      // Nothing to roll back client-side; the marker simply won't move
      // until the next successful submission.
    });
  }

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      // Capability can only be known client-side, inside this effect —
      // not derivable from `enabled` alone, unlike the idle/requesting
      // transition handled above during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("unavailable");
      setErrorMessage("This device doesn't support location sharing.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const fix: RiderLocationFix = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: Number.isFinite(position.coords.heading) ? position.coords.heading : null,
          speed: Number.isFinite(position.coords.speed) ? position.coords.speed : null,
        };
        setLastFix(fix);
        setStatus("active");
        setErrorMessage(null);

        if (!isAcceptableAccuracy(fix.accuracy)) return; // too noisy to bother submitting

        const now = Date.now();
        if (!shouldSubmit(lastSubmittedRef.current, fix, now)) return;

        if (!isOnlineRef.current) {
          pendingWhileOfflineRef.current = { fix, timestamp: position.timestamp };
          return;
        }
        submit(fix, position.timestamp);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus("denied");
          setErrorMessage("Location access was denied. Enable it in your browser/device settings to go online.");
        } else if (error.code === error.TIMEOUT) {
          setStatus("error");
          setErrorMessage("Location signal timed out. Still trying.");
        } else {
          setStatus("error");
          setErrorMessage("Location temporarily unavailable.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled]);

  return { status, lastFix, lastSubmittedAt, isOnline, errorMessage };
}
