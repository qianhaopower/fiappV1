import confetti from "canvas-confetti";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Some browsers throw if called too frequently; ignore.
    }
  }
}

/**
 * Subtle daily-completion burst. Originates from a click point if provided
 * (otherwise lower-centre of screen). Sized small so it doesn't fatigue
 * across daily repetition.
 */
export function celebrateDaily(origin?: { x: number; y: number }) {
  vibrate(15);

  if (prefersReducedMotion()) return;
  if (typeof window === "undefined") return;

  const x = origin ? origin.x / window.innerWidth : 0.5;
  const y = origin ? origin.y / window.innerHeight : 0.75;

  confetti({
    particleCount: 30,
    spread: 60,
    startVelocity: 35,
    decay: 0.92,
    ticks: 70,
    origin: { x, y },
    scalar: 0.7,
    disableForReducedMotion: true,
  });
}

/**
 * Milestone unlock burst. Larger, longer, full-screen — fires on streak
 * milestones (7-day, 30-day, etc.) where a louder reward is warranted.
 */
export function celebrateMilestone() {
  vibrate([15, 40, 15]);

  if (prefersReducedMotion()) return;

  // Centre burst
  confetti({
    particleCount: 80,
    spread: 70,
    startVelocity: 45,
    origin: { x: 0.5, y: 0.6 },
    disableForReducedMotion: true,
  });

  // Wings — fire a moment later so the eye catches the spread
  window.setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 60,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      disableForReducedMotion: true,
    });
  }, 200);
}
