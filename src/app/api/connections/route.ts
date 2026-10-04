import { sql } from "@/lib/server/db";
import { connectionsFor } from "@/lib/server/people";
import { currentUserId, unauthorized } from "@/lib/server/session";

/** Your decisions, who wants to meet you, and contacts unlocked by mutual yeses. */
export async function GET() {
  const me = await currentUserId();
  if (!me) return unauthorized();
  return Response.json(await connectionsFor(me));
}

/** Say yes / no to someone (or undo with decision: null). Contact details only unlock when both say yes. */
export async function POST(req: Request) {
  const me = await currentUserId();
  if (!me) return unauthorized();
  const { to, decision } = (await req.json()) as { to?: string; decision?: "yes" | "no" | null };
  if (!to || typeof to !== "string" || to === me) return Response.json({ error: "Invalid person" }, { status: 400 });
  if (decision === null) await sql`delete from decisions where from_user = ${me} and to_user = ${to}`;
  else if (decision === "yes" || decision === "no") {
    const [exists] = await sql`select 1 from profiles where user_id = ${to}`;
    if (!exists) return Response.json({ error: "That person isn't around anymore" }, { status: 404 });
    await sql`
      insert into decisions (from_user, to_user, decision) values (${me}, ${to}, ${decision})
      on conflict (from_user, to_user) do update set decision = excluded.decision, created_at = now()`;
  } else return Response.json({ error: "Invalid decision" }, { status: 400 });
  return Response.json(await connectionsFor(me));
}
