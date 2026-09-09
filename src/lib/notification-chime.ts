/**
 * A short synthesized "ding" — no audio file to ship/host, just WebAudio.
 * Shared by every staff screen that needs to announce "a new order just
 * showed up here" (KitchenBoard, OrderDesk) so they all sound the same cue.
 * Browsers block audio before any user gesture on the page; that's fine —
 * staff screens are interacted with constantly, and a blocked chime here is
 * never load-bearing (the order is still on screen either way).
 */
export function playNewOrderChime(): void {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.6);
  } catch {
    // Audio isn't critical to any of these screens working — ignore if unsupported/blocked.
  }
}
