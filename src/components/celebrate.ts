import confetti from "canvas-confetti";

/** Fires a tasteful confetti burst — used for successful redemptions and wins. */
export function celebrate() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  const colors = ["#6C5CE7", "#22D3EE", "#FFC65C", "#8B7CF6"];

  confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 40,
    origin: { y: 0.6 },
    colors,
    scalar: 0.9,
    ticks: 220,
  });

  setTimeout(() => {
    confetti({
      particleCount: 50,
      spread: 100,
      startVelocity: 25,
      origin: { y: 0.55 },
      colors,
      scalar: 0.7,
      ticks: 200,
    });
  }, 180);
}
