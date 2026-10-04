/** Shared colors + tiny random helpers used by the avatar builder, landing page and town. */
export const SHIRTS = ["#2f6fde", "#ff5a36", "#2bb673", "#8e44ad", "#ffb400", "#1d2433", "#e84393", "#16a085"];
export const PANTS = ["#2b3445", "#3d5a80", "#4a4a4a", "#5b4636", "#c8b48a"];

export const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];

/** Deterministic pseudo-random number in [0, 1) for a seed (stable layouts across renders). */
export function seeded(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}
