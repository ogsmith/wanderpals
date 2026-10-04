import { sql } from "@/lib/server/db";
import { palIds } from "@/lib/server/hangouts";
import { areNear, blockedIds } from "@/lib/server/live";
import { currentUserId, tooMany, unauthorized, withinLimit } from "@/lib/server/session";
import { SPOTS, type SpotKind } from "@/lib/state";

const bad = (error: string, status = 400) => Response.json({ error }, { status });
const isId = (v: unknown): v is string => typeof v === "string" && /^\d{1,18}$/.test(v);
const isUser = (v: unknown): v is string => typeof v === "string" && /^user_[A-Za-z0-9]{10,40}$/.test(v);

/** You can bring someone to a spot if they're right next to you in town, or they're your pal. */
async function canInvite(me: string, them: string) {
  if ((await blockedIds(me)).has(them)) return false;
  return (await palIds(me)).includes(them) || (await areNear(me, them));
}

/**
 * Hang spots:
 *   { action: "create", kind, invite: [id] }  → new spot, you're in, they're invited
 *   { action: "invite", id, invite: [id] }    → bring more people
 *   { action: "join" | "decline" | "leave", id }
 */
export async function POST(req: Request) {
  const me = await currentUserId();
  if (!me) return unauthorized();
  const b = (await req.json().catch(() => ({}))) as { action?: string; kind?: string; id?: unknown; invite?: unknown };
  const invite = Array.isArray(b.invite) ? b.invite.filter(isUser).slice(0, 8) : [];

  if (b.action === "create") {
    if (!b.kind || !(b.kind in SPOTS)) return bad("Pick a spot");
    for (const id of invite) if (!(await canInvite(me, id))) return bad("You can invite pals, or someone your pal is standing next to", 403);
    if (!(await withinLimit(me, "spots"))) return tooMany();
    const [spot] = (await sql`insert into spots (kind, created_by) values (${b.kind as SpotKind}, ${me}) returning id::text`) as { id: string }[];
    await sql`insert into spot_members (spot_id, user_id, status) values (${spot.id}::bigint, ${me}, 'joined')`;
    for (const id of invite) await sql`insert into spot_members (spot_id, user_id, status, invited_by) values (${spot.id}::bigint, ${id}, 'invited', ${me}) on conflict do nothing`;
    return Response.json({ id: spot.id, place: `spot:${spot.id}` });
  }

  if (!isId(b.id)) return bad("Invalid spot");
  const [mine] = (await sql`select status from spot_members where spot_id = ${b.id}::bigint and user_id = ${me}`) as { status: string }[];
  if (!mine) return bad("You weren't invited to this one", 403);

  if (b.action === "invite") {
    if (mine.status !== "joined") return bad("Join the spot first", 403);
    for (const id of invite) if (!(await canInvite(me, id))) return bad("You can invite pals, or someone your pal is standing next to", 403);
    for (const id of invite)
      await sql`insert into spot_members (spot_id, user_id, status, invited_by) values (${b.id}::bigint, ${id}, 'invited', ${me})
        on conflict (spot_id, user_id) do update set status = 'invited', invited_by = excluded.invited_by, updated_at = now() where spot_members.status <> 'joined'`;
    return Response.json({ ok: true });
  }
  const status = b.action === "join" ? "joined" : b.action === "decline" ? "declined" : b.action === "leave" ? "left" : null;
  if (!status) return bad("Unknown action");
  await sql`update spot_members set status = ${status}, updated_at = now() where spot_id = ${b.id}::bigint and user_id = ${me}`;
  return Response.json({ ok: true, place: status === "joined" ? `spot:${b.id}` : "town" });
}
