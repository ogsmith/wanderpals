import { calendarStatus, encrypt, syncCalendar } from "@/lib/server/calendar";
import { sql } from "@/lib/server/db";
import { safeCalendarUrl } from "@/lib/server/ics";
import { currentUserId, unauthorized } from "@/lib/server/session";

const bad = (error: string) => Response.json({ error }, { status: 400 });

export async function GET() {
  const me = await currentUserId();
  if (!me) return unauthorized();
  return Response.json({ calendar: await calendarStatus(me) });
}

/** Connect: { kind: "google" } (after linking Google with free/busy access) or { kind: "ics", url }. Syncs right away. */
export async function POST(req: Request) {
  const me = await currentUserId();
  if (!me) return unauthorized();
  const b = (await req.json().catch(() => ({}))) as { kind?: string; url?: unknown };
  if (b.kind === "ics") {
    const url = typeof b.url === "string" ? safeCalendarUrl(b.url) : null;
    if (!url) return bad("Paste a private iCal link (it starts with https:// or webcal://)");
    await sql`
      insert into calendars (user_id, kind, ics_url_enc, synced_at, error) values (${me}, 'ics', ${encrypt(url.toString())}, null, null)
      on conflict (user_id) do update set kind = 'ics', ics_url_enc = excluded.ics_url_enc, synced_at = null, error = null, connected_at = now()`;
  } else if (b.kind === "google") {
    await sql`
      insert into calendars (user_id, kind) values (${me}, 'google')
      on conflict (user_id) do update set kind = 'google', ics_url_enc = null, synced_at = null, error = null, connected_at = now()`;
  } else return bad("Unknown calendar type");
  await syncCalendar(me);
  return Response.json({ calendar: await calendarStatus(me) });
}

/** { share: boolean } — let pals see when you're free/busy (never event details). */
export async function PATCH(req: Request) {
  const me = await currentUserId();
  if (!me) return unauthorized();
  const { share } = (await req.json().catch(() => ({}))) as { share?: unknown };
  if (typeof share !== "boolean") return bad("share must be true or false");
  await sql`update calendars set share_with_pals = ${share} where user_id = ${me}`;
  return Response.json({ calendar: await calendarStatus(me) });
}

export async function DELETE() {
  const me = await currentUserId();
  if (!me) return unauthorized();
  await sql`delete from busy where user_id = ${me}`;
  await sql`delete from calendars where user_id = ${me}`;
  return Response.json({ calendar: null });
}
