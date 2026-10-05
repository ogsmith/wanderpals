import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { sql } from "./db";
import { busyFromIcs, safeCalendarUrl, type Busy } from "./ics";

/** Least privilege: Google only tells us when you're busy — no titles, attendees or locations. */
export const GOOGLE_FREEBUSY_SCOPE = "https://www.googleapis.com/auth/calendar.freebusy";
const STALE_MS = 15 * 60 * 1000;
const WINDOW_DAYS = 45;

export type CalendarStatus = { kind: "google" | "ics"; share: boolean; syncedAt: string | null; error: string | null } | null;
export type { Busy };

/* ----------------------------- link encryption ----------------------------- */

const key = () => {
  const k = Buffer.from(process.env.CALENDAR_KEY ?? "", "base64");
  if (k.length !== 32) throw new Error("CALENDAR_KEY must be 32 bytes (base64)");
  return k;
};
export function encrypt(text: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64")).join(".");
}
function decrypt(blob: string) {
  const [iv, tag, body] = blob.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString("utf8");
}

/* ------------------------------ fetching busy ------------------------------ */

async function fetchIcs(url: URL): Promise<string> {
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { accept: "text/calendar" } });
    if (res.status >= 300 && res.status < 400) {
      const next = safeCalendarUrl(new URL(res.headers.get("location") ?? "", current).toString());
      if (!next) throw new Error("Calendar link redirected somewhere we can't follow");
      current = next;
      continue;
    }
    if (!res.ok) throw new Error(`Calendar link returned ${res.status} — is it still shared?`);
    const text = await res.text();
    if (text.length > 8_000_000) throw new Error("That calendar is too big to read");
    if (!text.includes("BEGIN:VCALENDAR")) throw new Error("That link isn't an iCal (.ics) calendar");
    return text;
  }
  throw new Error("Too many redirects");
}

async function busyFromGoogle(userId: string, from: Date, to: Date): Promise<Busy> {
  const client = await clerkClient();
  const { data } = await client.users.getUserOauthAccessToken(userId, "google");
  const tok = data[0];
  if (!tok?.token) throw new Error("Google isn't connected — reconnect your calendar");
  if (tok.scopes && !tok.scopes.includes(GOOGLE_FREEBUSY_SCOPE)) throw new Error("Calendar permission is missing — reconnect Google Calendar");
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { authorization: `Bearer ${tok.token}`, "content-type": "application/json" },
    body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: "primary" }] }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Google Calendar said ${res.status} — try reconnecting`);
  const d = (await res.json()) as { calendars?: { primary?: { busy?: { start: string; end: string }[] } } };
  return (d.calendars?.primary?.busy ?? []).map((b) => [new Date(b.start).toISOString(), new Date(b.end).toISOString()]);
}

/** Refresh one person's busy cache from their calendar (Google or link). Errors are saved, not thrown. */
export async function syncCalendar(userId: string): Promise<void> {
  const [cal] = (await sql`select kind, ics_url_enc from calendars where user_id = ${userId}`) as { kind: "google" | "ics"; ics_url_enc: string | null }[];
  if (!cal) return;
  const from = new Date(Date.now() - 864e5);
  const to = new Date(Date.now() + WINDOW_DAYS * 864e5);
  try {
    let busy: Busy;
    if (cal.kind === "google") busy = await busyFromGoogle(userId, from, to);
    else {
      const url = safeCalendarUrl(decrypt(cal.ics_url_enc ?? ""));
      if (!url) throw new Error("Calendar link is invalid");
      busy = busyFromIcs(await fetchIcs(url), from, to);
    }
    await sql`delete from busy where user_id = ${userId}`;
    for (let i = 0; i < busy.length; i += 200) {
      const chunk = busy.slice(i, i + 200);
      await sql`insert into busy (user_id, starts, ends) select ${userId}, s, e from unnest(${chunk.map((b) => b[0])}::timestamptz[], ${chunk.map((b) => b[1])}::timestamptz[]) as t(s, e)`;
    }
    await sql`update calendars set synced_at = now(), error = null where user_id = ${userId}`;
  } catch (e) {
    await sql`update calendars set synced_at = now(), error = ${(e as Error).message.slice(0, 200)} where user_id = ${userId}`;
  }
}

export async function calendarStatus(userId: string): Promise<CalendarStatus> {
  const [c] = (await sql`select kind, share_with_pals, synced_at, error from calendars where user_id = ${userId}`) as {
    kind: "google" | "ics";
    share_with_pals: boolean;
    synced_at: string | null;
    error: string | null;
  }[];
  return c ? { kind: c.kind, share: c.share_with_pals, syncedAt: c.synced_at ? new Date(c.synced_at).toISOString() : null, error: c.error } : null;
}

/** Busy blocks for these people in [from, to], refreshing anyone whose cache is stale. */
export async function busyFor(userIds: string[], from: Date, to: Date): Promise<Record<string, Busy>> {
  if (!userIds.length) return {};
  const stale = (await sql`
    select user_id from calendars where user_id = any(${userIds}::text[])
      and (synced_at is null or synced_at < ${new Date(Date.now() - STALE_MS).toISOString()}::timestamptz)`) as { user_id: string }[];
  await Promise.all(stale.map((s) => syncCalendar(s.user_id)));
  const rows = (await sql`
    select user_id, starts, ends from busy
    where user_id = any(${userIds}::text[]) and ends > ${from.toISOString()}::timestamptz and starts < ${to.toISOString()}::timestamptz
    order by starts`) as { user_id: string; starts: string; ends: string }[];
  const out: Record<string, Busy> = {};
  for (const id of userIds) out[id] = [];
  for (const r of rows) out[r.user_id].push([new Date(r.starts).toISOString(), new Date(r.ends).toISOString()]);
  return out;
}
