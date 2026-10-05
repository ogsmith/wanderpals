import ICAL from "ical.js";

/** [start, end] ISO pairs — busy times only, never event details. */
export type Busy = [start: string, end: string][];

/** Calendar links are user-supplied URLs we fetch from the server, so only allow public https hosts. */
export function safeCalendarUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim().replace(/^webcals?:\/\//i, "https://"));
    if (u.protocol !== "https:" || u.username || u.password) return null;
    const host = u.hostname.toLowerCase();
    const ipLike = /^[\d.]+$/.test(host) || host.includes(":") || host.startsWith("[");
    if (ipLike || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || !host.includes(".")) return null;
    return u;
  } catch {
    return null;
  }
}

/** Busy blocks from an iCal feed: expands recurring events; skips all-day, cancelled and "free" events. */
export function busyFromIcs(ics: string, from: Date, to: Date): Busy {
  const root = new ICAL.Component(ICAL.parse(ics));
  for (const tz of root.getAllSubcomponents("vtimezone")) ICAL.TimezoneService.register(tz);
  const out: Busy = [];
  for (const vevent of root.getAllSubcomponents("vevent")) {
    if (String(vevent.getFirstPropertyValue("status") ?? "").toUpperCase() === "CANCELLED") continue;
    if (String(vevent.getFirstPropertyValue("transp") ?? "").toUpperCase() === "TRANSPARENT") continue;
    if (vevent.hasProperty("recurrence-id")) continue; // exceptions are handled by the master's expansion
    const ev = new ICAL.Event(vevent);
    if (ev.startDate?.isDate) continue; // all-day: birthdays, holidays, OOO notes — don't block the whole day
    const push = (s: Date, e: Date) => {
      if (e > from && s < to) out.push([s.toISOString(), e.toISOString()]);
    };
    if (!ev.isRecurring()) {
      push(ev.startDate.toJSDate(), ev.endDate.toJSDate());
      continue;
    }
    const it = ev.iterator();
    for (let i = 0, next = it.next(); next && i < 2000; i++, next = it.next()) {
      const occ = ev.getOccurrenceDetails(next);
      const s = occ.startDate.toJSDate();
      if (s > to) break;
      push(s, occ.endDate.toJSDate());
    }
  }
  return out;
}

