import { sql } from "@/lib/server/db";
import { currentUserId, unauthorized } from "@/lib/server/session";
import type { Trip } from "@/lib/state";

const MAX_BYTES = 500_000;

export async function PUT(req: Request) {
  const me = await currentUserId();
  if (!me) return unauthorized();
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return Response.json({ error: "Trip too large" }, { status: 413 });
  const { key, trip } = JSON.parse(raw) as { key?: string; trip?: Trip };
  if (!key || key.length > 200 || !trip || !Array.isArray(trip.found)) return Response.json({ error: "Invalid trip" }, { status: 400 });
  await sql`
    insert into trips (user_id, key, data, updated_at) values (${me}, ${key}, ${JSON.stringify(trip)}::jsonb, now())
    on conflict (user_id, key) do update set data = excluded.data, updated_at = now()`;
  return Response.json({ ok: true });
}

/** Clears every walk (used when your goal or personality changes and old matches go stale). */
export async function DELETE() {
  const me = await currentUserId();
  if (!me) return unauthorized();
  await sql`delete from trips where user_id = ${me}`;
  return Response.json({ ok: true });
}
