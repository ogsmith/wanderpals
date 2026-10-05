import { busyFor } from "@/lib/server/calendar";
import { sql } from "@/lib/server/db";
import { palIds } from "@/lib/server/hangouts";
import { currentUserId, unauthorized } from "@/lib/server/session";

/**
 * { ids: [pal ids], from, to } → busy times for you ("me") and each pal who shares their calendar.
 * Anyone who isn't your pal, hasn't connected a calendar, or doesn't share comes back in `unknown`.
 */
export async function POST(req: Request) {
  const me = await currentUserId();
  if (!me) return unauthorized();
  const b = (await req.json().catch(() => ({}))) as { ids?: unknown; from?: unknown; to?: unknown };
  const from = new Date(String(b.from ?? ""));
  const to = new Date(String(b.to ?? ""));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from || to.getTime() - from.getTime() > 46 * 864e5)
    return Response.json({ error: "Pick a window up to ~6 weeks" }, { status: 400 });
  const asked = Array.isArray(b.ids) ? [...new Set(b.ids.filter((x): x is string => typeof x === "string"))].slice(0, 12) : [];

  const pals = new Set(await palIds(me));
  const sharing = (await sql`
    select user_id from calendars where share_with_pals and user_id = any(${asked.filter((id) => pals.has(id))}::text[])`) as { user_id: string }[];
  const allowed = sharing.map((s) => s.user_id);
  const [mine] = await sql`select 1 from calendars where user_id = ${me}`;

  const busy = await busyFor([...(mine ? [me] : []), ...allowed], from, to);
  const out: Record<string, [string, string][]> = {};
  if (mine) out.me = busy[me] ?? [];
  for (const id of allowed) out[id] = busy[id] ?? [];
  return Response.json({ busy: out, unknown: asked.filter((id) => !allowed.includes(id)), meConnected: !!mine });
}
