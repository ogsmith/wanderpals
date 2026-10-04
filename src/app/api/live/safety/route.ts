import { sql } from "@/lib/server/db";
import { currentUserId, unauthorized } from "@/lib/server/session";

/** Block someone (they vanish from your town and can't message you), optionally reporting them too. */
export async function POST(req: Request) {
  const me = await currentUserId();
  if (!me) return unauthorized();
  const b = (await req.json().catch(() => ({}))) as { id?: unknown; report?: unknown; reason?: unknown; context?: unknown };
  if (typeof b.id !== "string" || !/^user_[A-Za-z0-9]{10,40}$/.test(b.id) || b.id === me) return Response.json({ error: "Invalid person" }, { status: 400 });
  await sql`insert into blocks (blocker, blocked) values (${me}, ${b.id}) on conflict do nothing`;
  if (b.report) {
    const reason = typeof b.reason === "string" ? b.reason.slice(0, 500) : "";
    const context = typeof b.context === "string" ? b.context.slice(0, 4000) : "";
    await sql`insert into reports (reporter, reported, reason, context) values (${me}, ${b.id}, ${reason}, ${context})`;
  }
  return Response.json({ ok: true });
}
