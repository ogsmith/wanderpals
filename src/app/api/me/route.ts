import { sql } from "@/lib/server/db";
import { placeColumns } from "@/lib/server/people";
import { currentUserId, unauthorized } from "@/lib/server/session";
import type { AppState, Trip } from "@/lib/state";

const MAX_BYTES = 200_000;

/** Your saved profile + every town walk you've taken. */
export async function GET() {
  const me = await currentUserId();
  if (!me) return unauthorized();
  const [profile] = (await sql`select state from profiles where user_id = ${me}`) as { state: AppState }[];
  const trips = (await sql`select key, data from trips where user_id = ${me}`) as { key: string; data: Trip }[];
  return Response.json({ state: profile?.state ?? null, trips: Object.fromEntries(trips.map((t) => [t.key, t.data])) });
}

export async function PUT(req: Request) {
  const me = await currentUserId();
  if (!me) return unauthorized();
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return Response.json({ error: "Profile too large" }, { status: 413 });
  const { state } = JSON.parse(raw) as { state?: AppState };
  if (!state?.basics || !state.look || !state.search) return Response.json({ error: "Invalid profile" }, { status: 400 });

  const c = placeColumns(state);
  await sql`
    insert into profiles (user_id, state, onboarded, home_lat, home_lng, trip_label, trip_lat, trip_lng, updated_at)
    values (${me}, ${JSON.stringify(state)}::jsonb, ${c.onboarded}, ${c.home_lat}, ${c.home_lng}, ${c.trip_label}, ${c.trip_lat}, ${c.trip_lng}, now())
    on conflict (user_id) do update set
      state = excluded.state, onboarded = excluded.onboarded,
      home_lat = excluded.home_lat, home_lng = excluded.home_lng,
      trip_label = excluded.trip_label, trip_lat = excluded.trip_lat, trip_lng = excluded.trip_lng,
      updated_at = now()`;
  return Response.json({ ok: true });
}

/** Removes your profile from the town (and everything tied to it). Your sign-in account stays. */
export async function DELETE() {
  const me = await currentUserId();
  if (!me) return unauthorized();
  await sql`delete from trips where user_id = ${me}`;
  await sql`delete from hangouts where host = ${me}`;
  await sql`delete from hangout_people where user_id = ${me}`;
  await sql`delete from presence where user_id = ${me}`;
  await sql`delete from spot_members where user_id = ${me}`;
  await sql`delete from messages where from_user = ${me}`;
  await sql`delete from decisions where from_user = ${me} or to_user = ${me}`;
  await sql`delete from profiles where user_id = ${me}`;
  return Response.json({ ok: true });
}
