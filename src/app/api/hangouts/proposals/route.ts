import { sql } from "@/lib/server/db";
import { applyChange, visibleHangouts } from "@/lib/server/hangouts";
import { currentUserId, tooMany, unauthorized, withinLimit } from "@/lib/server/session";

const bad = (error: string, status = 400) => Response.json({ error }, { status });
const clean = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const isId = (v: unknown): v is string => typeof v === "string" && /^\d{1,18}$/.test(v);

/** Suggest a different time / place / idea for a hangout you can see (even if you said you can't make it). */
export async function POST(req: Request) {
  const me = await currentUserId();
  if (!me) return unauthorized();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isId(b.hangoutId)) return bad("Invalid hangout");
  const [h] = await visibleHangouts(me, b.hangoutId);
  if (!h) return bad("That hangout isn't available", 404);
  const startsAt = typeof b.startsAt === "string" && b.startsAt ? new Date(b.startsAt) : null;
  if (startsAt && (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now() - 3600_000 || startsAt.getTime() > Date.now() + 365 * 864e5)) return bad("Pick a time in the future");
  const place = clean(b.place, 120);
  const title = clean(b.title, 80);
  const note = clean(b.note, 300) ?? "";
  if (!startsAt && !place && !title) return bad("Suggest a new time, place or idea");
  if (!(await withinLimit(me, "hangouts"))) return tooMany();
  const [p] = (await sql`
    insert into hangout_proposals (hangout_id, proposer, starts_at, place, title, note)
    values (${b.hangoutId}::bigint, ${me}, ${startsAt?.toISOString() ?? null}, ${place ?? null}, ${title ?? null}, ${note})
    returning id::text`) as { id: string }[];
  await sql`insert into hangout_votes (proposal_id, user_id) values (${p.id}::bigint, ${me}) on conflict do nothing`; // you're in for your own idea
  return Response.json({ hangouts: await visibleHangouts(me) });
}

/** { id, action: "vote" | "unvote" | "withdraw" | "accept" | "dismiss" } — host accepts/dismisses, proposer withdraws, anyone votes. */
export async function PATCH(req: Request) {
  const me = await currentUserId();
  if (!me) return unauthorized();
  const b = (await req.json().catch(() => ({}))) as { id?: unknown; action?: string };
  if (!isId(b.id)) return bad("Invalid suggestion");
  const [p] = (await sql`
    select p.id::text, p.hangout_id::text, p.proposer, p.starts_at, p.place, p.title, p.status, h.host
    from hangout_proposals p join hangouts h on h.id = p.hangout_id where p.id = ${b.id}::bigint`) as {
    id: string;
    hangout_id: string;
    proposer: string;
    starts_at: string | null;
    place: string | null;
    title: string | null;
    status: string;
    host: string;
  }[];
  if (!p || p.status !== "open") return bad("That suggestion is closed", 404);
  const [visible] = await visibleHangouts(me, p.hangout_id);
  if (!visible) return bad("That hangout isn't available", 404);

  if (b.action === "vote") await sql`insert into hangout_votes (proposal_id, user_id) values (${p.id}::bigint, ${me}) on conflict do nothing`;
  else if (b.action === "unvote") await sql`delete from hangout_votes where proposal_id = ${p.id}::bigint and user_id = ${me}`;
  else if (b.action === "withdraw") {
    if (p.proposer !== me) return bad("Only whoever suggested it can withdraw it", 403);
    await sql`update hangout_proposals set status = 'dismissed' where id = ${p.id}::bigint`;
  } else if (b.action === "dismiss" || b.action === "accept") {
    if (p.host !== me) return bad("Only the host can decide", 403);
    if (b.action === "accept") {
      const voters = ((await sql`select user_id from hangout_votes where proposal_id = ${p.id}::bigint`) as { user_id: string }[]).map((v) => v.user_id);
      await applyChange(
        p.hangout_id,
        p.host,
        { startsAt: p.starts_at ?? undefined, place: p.place ?? undefined, title: p.title ?? undefined },
        [p.proposer, ...voters],
      );
    }
    await sql`update hangout_proposals set status = ${b.action === "accept" ? "accepted" : "dismissed"} where id = ${p.id}::bigint`;
  } else return bad("Unknown action");
  return Response.json({ hangouts: await visibleHangouts(me) });
}
