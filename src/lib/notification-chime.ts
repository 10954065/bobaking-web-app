/**
 * A synthesized "new order" alert — no audio file to ship/host, just
 * WebAudio. Shared by every staff screen that needs to announce "a new
 * order just showed up here" (KitchenBoard, OrderDesk) so they all sound
 * the same cue. Browsers block audio before any user gesture on the page;
 * that's fine — staff screens are interacted with constantly, and a
 * blocked chime here is never load-bearing (the order is still on screen
 * either way).
 *
 * A two-note doorbell interval played twice (not a single beep) — long and
 * distinct enough to notice over a busy, noisy kitchen/front-desk floor
 * without needing to be looking at the screen when an order lands.
 */
const CHIME_NOTES: { freq: number; startOffset: number; duration: number }[] = [
  { freq: 1046.5, startOffset: 0, duration: 0.35 },
  { freq: 784, startOffset: 0.3, duration: 0.45 },
  { freq: 1046.5, startOffset: 0.85, duration: 0.35 },
  { freq: 784, startOffset: 1.15, duration: 0.55 },
];

function playTone(ctx: AudioContext, freq: number, startTime: number, duration: number): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

export function playNewOrderChime(): void {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;
    for (const note of CHIME_NOTES) {
      playTone(ctx, note.freq, now + note.startOffset, note.duration);
    }
  } catch {
    // Audio isn't critical to any of these screens working — ignore if unsupported/blocked.
  }
}
