import { heartbeat } from "@/lib/server/live";
import { currentUserId, unauthorized } from "@/lib/server/session";

/** Heartbeat (~every 2s while the town is open): "my pal is here" → who's online near me, invites, my spot. */
export async function POST(req: Request) {
  const me = await currentUserId();
  if (!me) return unauthorized();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const num = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null);
  const place = typeof b.place === "string" && /^(town|spot:\d{1,18})$/.test(b.place) ? b.place : "town";
  return Response.json(
    await heartbeat(me, { place, x: num(b.x, 0, 100) ?? 50, y: num(b.y, 0, 100) ?? 75, lat: num(b.lat, -90, 90), lng: num(b.lng, -180, 180) }),
  );
}
