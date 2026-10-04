import { sql } from "@/lib/server/db";
import { palIds, visibleHangouts } from "@/lib/server/hangouts";
import { currentUserId, tooMany, unauthorized, withinLimit } from "@/lib/server/session";

const bad = (error: string) => Response.json({ error }, { status: 400 });
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function GET() {
  const me = await currentUserId();
  if (!me) return unauthorized();
  return Response.json({ hangouts: await visibleHangouts(me) });
}

/** Plan a hangout and invite pals. You're automatically "going". */
export async function POST(req: Request) {
  const me = await currentUserId();
  if (!me) return unauthorized();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = clean(body.title, 80);
  const place = clean(body.place, 120);
  const note = clean(body.note, 500);
  const startsAt = new Date(String(body.startsAt ?? ""));
  const invite = Array.isArray(body.invite) ? body.invite.filter((x): x is string => typeof x === "string") : [];
  if (!title) return bad("Give your hangout a name");
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now() - 60 * 60 * 1000 || startsAt.getTime() > Date.now() + 365 * 24 * 3600 * 1000)
    return bad("Pick a time in the future");
  const pals = new Set(await palIds(me));
  if (invite.some((id) => !pals.has(id))) return bad("You can only invite your pals");
  if (!(await withinLimit(me, "hangouts"))) return tooMany();

  const [row] = (await sql`
    insert into hangouts (host, title, place, starts_at, note, open_to_pals)
    values (${me}, ${title}, ${place}, ${startsAt.toISOString()}, ${note}, ${body.open !== false})
    returning id::text`) as { id: string }[];
  await sql`insert into hangout_people (hangout_id, user_id, status) values (${row.id}::bigint, ${me}, 'going')`;
  for (const id of invite) await sql`insert into hangout_people (hangout_id, user_id, status) values (${row.id}::bigint, ${id}, 'invited') on conflict do nothing`;
  return Response.json({ hangouts: await visibleHangouts(me) });
}

/** RSVP (or join an open hangout hosted by a pal). */
export async function PATCH(req: Request) {
  const me = await currentUserId();
  if (!me) return unauthorized();
  const { id, status } = (await req.json().catch(() => ({}))) as { id?: string; status?: string };
  if (!id || !/^\d+$/.test(id) || !["going", "maybe", "declined"].includes(status ?? "")) return bad("Invalid RSVP");
  const [visible] = await visibleHangouts(me, id);
  if (!visible) return Response.json({ error: "That hangout isn't available" }, { status: 404 });
  if (visible.isHost) return bad("You're hosting this one");
  await sql`
    insert into hangout_people (hangout_id, user_id, status) values (${id}::bigint, ${me}, ${status})
    on conflict (hangout_id, user_id) do update set status = excluded.status, updated_at = now()`;
  return Response.json({ hangouts: await visibleHangouts(me) });
}

/** Host cancels. */
export async function DELETE(req: Request) {
  const me = await currentUserId();
  if (!me) return unauthorized();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^\d+$/.test(id)) return bad("Invalid hangout");
  await sql`delete from hangouts where id = ${id}::bigint and host = ${me}`;
  return Response.json({ hangouts: await visibleHangouts(me) });
}
