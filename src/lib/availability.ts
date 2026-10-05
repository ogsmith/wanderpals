/** Free/busy helpers shared by planning UIs. Busy = [startISO, endISO][]. */
export type Busy = [string, string][];
export type BusyMap = Record<string, Busy>; // "me" plus pal ids

export const HANG_MINUTES = 120;

export function isFree(busy: Busy | undefined, start: Date, minutes = HANG_MINUTES): boolean | null {
  if (!busy) return null; // unknown (no calendar / not shared)
  const s = start.getTime(),
    e = s + minutes * 60_000;
  return !busy.some(([a, b]) => new Date(a).getTime() < e && new Date(b).getTime() > s);
}

/** Typical hang times over the next couple of weeks: weekday evenings, weekend brunch / afternoon / night. */
function candidates(days: number): Date[] {
  const out: Date[] = [];
  const now = new Date();
  for (let i = 0; i <= days; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    for (const [h, m] of weekend ? [[11, 0], [14, 0], [19, 0]] : [[18, 30], [19, 30]]) {
      const t = new Date(d);
      t.setHours(h, m, 0, 0);
      if (t.getTime() > now.getTime() + 2 * 3600_000) out.push(t);
    }
  }
  return out;
}

/** Soonest slots where everyone whose calendar we can see is free. */
export function timesThatWork(busy: BusyMap, max = 4, days = 14): Date[] {
  const known = Object.values(busy);
  if (!known.length) return [];
  return candidates(days)
    .filter((t) => known.every((b) => isFree(b, t)))
    .slice(0, max);
}

export const shortWhen = (d: Date) => d.toLocaleString(undefined, { weekday: "short", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
