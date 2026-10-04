import "server-only";
import { NEAR, nearDistance, type LivePerson, type LiveState, type SpotKind } from "@/lib/state";
import type { Townsperson } from "@/lib/types";
import { milesBetweenCoords } from "@/lib/towns";
import { sql } from "./db";
import { toPerson } from "./people";

/** Presence older than this means the person closed the tab. */
const FRESH = "20 seconds";
const RADIUS_MILES = 40;

type Row = Parameters<typeof toPerson>[0] & { x: number; y: number; place: string; p_lat: number | null; p_lng: number | null };

/** Ids that either blocked me or I blocked — they never see each other. */
export async function blockedIds(me: string): Promise<Set<string>> {
  const rows = (await sql`select blocked as id from blocks where blocker = ${me} union select blocker from blocks where blocked = ${me}`) as { id: string }[];
  return new Set(rows.map((r) => r.id));
}

export async function heartbeat(me: string, at: { place: string; x: number; y: number; lat: number | null; lng: number | null }): Promise<LiveState> {
  await sql`
    insert into presence (user_id, place, x, y, lat, lng, updated_at) values (${me}, ${at.place}, ${at.x}, ${at.y}, ${at.lat}, ${at.lng}, now())
    on conflict (user_id) do update set place = excluded.place, x = excluded.x, y = excluded.y, lat = excluded.lat, lng = excluded.lng, updated_at = now()`;
  const blocked = await blockedIds(me);

  const rows = (await sql`
    select p.user_id, p.state, p.home_lat, p.home_lng, p.trip_label, p.trip_lat, p.trip_lng,
           l.x, l.y, l.place, l.lat as p_lat, l.lng as p_lng
    from presence l join profiles p on p.user_id = l.user_id
    where l.updated_at > now() - ${FRESH}::interval and l.user_id <> ${me} and l.place = ${at.place} and p.onboarded`) as Row[];

  // In town: anyone online within 40 miles. In a spot: everyone in that spot.
  const people: LivePerson[] = [];
  for (const r of rows) {
    if (blocked.has(r.user_id)) continue;
    if (at.place === "town") {
      if (at.lat === null || at.lng === null || r.p_lat === null || r.p_lng === null) continue;
      if (milesBetweenCoords([at.lat, at.lng], [r.p_lat, r.p_lng]) > RADIUS_MILES) continue;
    }
    const p = toPerson(r, "local");
    if (p) people.push({ ...p, x: r.x, y: r.y });
  }

  const invites = (
    (await sql`
      select s.id::text, s.kind, m.invited_by from spot_members m join spots s on s.id = m.spot_id
      where m.user_id = ${me} and m.status = 'invited' and s.created_at > now() - interval '3 hours'
      order by s.created_at desc limit 5`) as { id: string; kind: SpotKind; invited_by: string }[]
  ).filter((i) => !blocked.has(i.invited_by));
  const inviters = await peopleById(invites.map((i) => i.invited_by));

  let spot: LiveState["spot"] = null;
  if (at.place.startsWith("spot:")) {
    const id = at.place.slice(5);
    const [s] = (await sql`select id::text, kind from spots where id = ${id}::bigint`) as { id: string; kind: SpotKind }[];
    const memberIds = (await sql`select user_id from spot_members where spot_id = ${id}::bigint and status = 'joined' and user_id <> ${me}`) as { user_id: string }[];
    if (s) spot = { id: s.id, kind: s.kind, members: [...(await peopleById(memberIds.map((m) => m.user_id))).values()] };
  }

  return {
    people,
    invites: invites.filter((i) => inviters.has(i.invited_by)).map((i) => ({ id: i.id, kind: i.kind, from: inviters.get(i.invited_by)! })),
    spot,
  };
}

export async function peopleById(ids: string[]): Promise<Map<string, Townsperson>> {
  if (!ids.length) return new Map();
  const rows = (await sql`select user_id, state, home_lat, home_lng, trip_label, trip_lat, trip_lng from profiles where user_id = any(${ids}::text[])`) as Parameters<typeof toPerson>[0][];
  const out = new Map<string, Townsperson>();
  for (const r of rows) {
    const p = toPerson(r, "local");
    if (p) out.set(r.user_id, p);
  }
  return out;
}

/** Both online, both out in town, and their pals are standing close together right now. */
export async function areNear(a: string, b: string): Promise<boolean> {
  const rows = (await sql`
    select user_id, x, y, lat, lng from presence
    where user_id = any(${[a, b]}::text[]) and place = 'town' and updated_at > now() - ${FRESH}::interval`) as { user_id: string; x: number; y: number; lat: number | null; lng: number | null }[];
  if (rows.length !== 2) return false;
  const [p, q] = rows;
  if (p.lat === null || p.lng === null || q.lat === null || q.lng === null) return false;
  if (milesBetweenCoords([p.lat, p.lng], [q.lat, q.lng]) > RADIUS_MILES) return false;
  return nearDistance(p, q) <= NEAR * 1.3; // a little slack for the ~2s heartbeat lag
}

export async function isSpotMember(me: string, spotId: string): Promise<boolean> {
  const [row] = await sql`select 1 from spot_members where spot_id = ${spotId}::bigint and user_id = ${me} and status = 'joined'`;
  return !!row;
}
