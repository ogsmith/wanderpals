import { ensureSchema, sql } from "@/lib/server/db";
import { currentUserId, unauthorized } from "@/lib/server/session";
import type { AppState } from "@/lib/state";

/** Invite links look like /?ref=<inviter's user id>. */
const validCode = (c: unknown): c is string => typeof c === "string" && /^user_[A-Za-z0-9]{10,40}$/.test(c);

/** Public: who sent this invite? Only their first name and avatar, so the landing page can say "Andrew invited you!". */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");
  if (!validCode(code)) return Response.json({ error: "Invalid invite" }, { status: 400 });
  await ensureSchema();
  const [row] = (await sql`select state from profiles where user_id = ${code} and onboarded`) as { state: AppState }[];
  if (!row) return Response.json({ error: "Invite not found" }, { status: 404 });
  return Response.json({ name: row.state.basics.name.trim().split(/\s+/)[0], look: row.state.look });
}

/** After signing up from an invite: the inviter has already said yes, so they show up in "wants to meet you". */
export async function POST(req: Request) {
  const me = await currentUserId();
  if (!me) return unauthorized();
  const { code } = (await req.json().catch(() => ({}))) as { code?: unknown };
  if (!validCode(code) || code === me) return Response.json({ ok: false });
  const [inviter] = (await sql`select state from profiles where user_id = ${code} and onboarded`) as { state: AppState }[];
  if (!inviter) return Response.json({ ok: false });
  await sql`insert into decisions (from_user, to_user, decision) values (${code}, ${me}, 'yes') on conflict do nothing`;
  return Response.json({ ok: true, name: inviter.state.basics.name.trim().split(/\s+/)[0] });
}
