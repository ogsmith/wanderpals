import "server-only";
import { auth } from "@clerk/nextjs/server";
import { ensureSchema, sql } from "./db";

export const unauthorized = () => Response.json({ error: "Sign in required" }, { status: 401 });
export const tooMany = () => Response.json({ error: "Daily limit reached — try again tomorrow." }, { status: 429 });

/** The signed-in user's id, with the schema ready. null if signed out. */
export async function currentUserId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  await ensureSchema();
  return userId;
}

/** Per-user daily caps on the calls that cost money (Claude, Google Maps). */
const LIMITS = { ai: 60, places: 600, hangouts: 20 } as const;

export async function withinLimit(userId: string, kind: keyof typeof LIMITS): Promise<boolean> {
  const rows = (await sql`
    insert into usage (user_id, kind, count) values (${userId}, ${kind}, 1)
    on conflict (user_id, day, kind) do update set count = usage.count + 1
    returning count`) as { count: number }[];
  return rows[0].count <= LIMITS[kind];
}
