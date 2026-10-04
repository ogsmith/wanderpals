import { sql } from "@/lib/server/db";
import { areNear, blockedIds, isSpotMember } from "@/lib/server/live";
import { currentUserId, tooMany, unauthorized, withinLimit } from "@/lib/server/session";
import { dmConv, type ChatMessage } from "@/lib/state";

const bad = (error: string, status = 400) => Response.json({ error }, { status });

/** Which conversation, and may I use it? 1:1 chats need you to be near each other; spot chats need you inside. */
async function resolve(me: string, params: { with?: unknown; spot?: unknown }, writing: boolean) {
  if (typeof params.with === "string" && /^user_[A-Za-z0-9]{10,40}$/.test(params.with)) {
    if ((await blockedIds(me)).has(params.with)) return { error: bad("You can't chat with this person", 403) };
    if (writing && !(await areNear(me, params.with))) return { error: bad("Walk your pal over to them to chat", 403) };
    return { conv: dmConv(me, params.with) };
  }
  if (typeof params.spot === "string" && /^\d{1,18}$/.test(params.spot)) {
    if (!(await isSpotMember(me, params.spot))) return { error: bad("You're not in this hang spot", 403) };
    return { conv: `spot:${params.spot}` };
  }
  return { error: bad("Missing conversation") };
}

export async function GET(req: Request) {
  const me = await currentUserId();
  if (!me) return unauthorized();
  const url = new URL(req.url);
  const r = await resolve(me, { with: url.searchParams.get("with") ?? undefined, spot: url.searchParams.get("spot") ?? undefined }, false);
  if (r.error) return r.error;
  const after = /^\d+$/.test(url.searchParams.get("after") ?? "") ? url.searchParams.get("after")! : "0";
  const blocked = [...(await blockedIds(me))];
  const rows = (await sql`
    select m.id::text, m.from_user, m.body, m.created_at, p.state->'basics'->>'name' as name
    from messages m left join profiles p on p.user_id = m.from_user
    where m.conv = ${r.conv} and m.id > ${after}::bigint and m.created_at > now() - interval '7 days'
      and not (m.from_user = any(${blocked}::text[]))
    order by m.id desc limit 60`) as { id: string; from_user: string; body: string; created_at: string; name: string | null }[];
  const messages: ChatMessage[] = rows.reverse().map((m) => ({
    id: m.id,
    from: m.from_user === me ? "me" : m.from_user,
    name: (m.name ?? "Someone").trim().split(/\s+/)[0],
    body: m.body,
    at: new Date(m.created_at).toISOString(),
  }));
  return Response.json({ messages });
}

export async function POST(req: Request) {
  const me = await currentUserId();
  if (!me) return unauthorized();
  const b = (await req.json().catch(() => ({}))) as { with?: unknown; spot?: unknown; body?: unknown };
  const body = typeof b.body === "string" ? b.body.trim().slice(0, 500) : "";
  if (!body) return bad("Say something!");
  const r = await resolve(me, b, true);
  if (r.error) return r.error;
  if (!(await withinLimit(me, "chat"))) return tooMany();
  const [row] = (await sql`insert into messages (conv, from_user, body) values (${r.conv}, ${me}, ${body}) returning id::text, created_at`) as { id: string; created_at: string }[];
  return Response.json({ message: { id: row.id, from: "me", name: "You", body, at: new Date(row.created_at).toISOString() } satisfies ChatMessage });
}
