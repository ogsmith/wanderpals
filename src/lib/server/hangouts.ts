import "server-only";
import type { Hangout, RSVP } from "@/lib/state";
import type { Townsperson } from "@/lib/types";
import { sql } from "./db";
import { toPerson } from "./people";

/** Ids of people you're pals with (both said yes). */
export async function palIds(me: string): Promise<string[]> {
  const rows = (await sql`
    select a.to_user as id from decisions a
    join decisions b on b.from_user = a.to_user and b.to_user = a.from_user
    where a.from_user = ${me} and a.decision = 'yes' and b.decision = 'yes'`) as { id: string }[];
  return rows.map((r) => r.id);
}

type Row = { id: string; host: string; title: string; place: string; starts_at: string; note: string; open_to_pals: boolean };

/** Hangouts you can see: yours, ones you're on, and open ones hosted by your pals. Recent past ones stay visible for a day. */
export async function visibleHangouts(me: string, onlyId?: string): Promise<Hangout[]> {
  const pals = await palIds(me);
  const rows = (await sql`
    select h.id::text, h.host, h.title, h.place, h.starts_at, h.note, h.open_to_pals from hangouts h
    where h.starts_at > now() - interval '1 day'
      and (${onlyId ?? null}::bigint is null or h.id = ${onlyId ?? null}::bigint)
      and (
        h.host = ${me}
        or exists (select 1 from hangout_people hp where hp.hangout_id = h.id and hp.user_id = ${me})
        or (h.open_to_pals and h.host = any(${pals}::text[]))
      )
    order by h.starts_at
    limit 50`) as Row[];
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const people = (await sql`select hangout_id::text, user_id, status, invited_by from hangout_people where hangout_id = any(${ids}::bigint[])`) as {
    hangout_id: string;
    user_id: string;
    status: RSVP;
    invited_by: string | null;
  }[];
  const userIds = [...new Set([...rows.map((r) => r.host), ...people.flatMap((p) => [p.user_id, p.invited_by ?? []].flat())])];
  const profiles = (await sql`
    select user_id, state, home_lat, home_lng, trip_label, trip_lat, trip_lng from profiles where user_id = any(${userIds}::text[])`) as Parameters<typeof toPerson>[0][];
  const byId = new Map<string, Townsperson>();
  for (const p of profiles) {
    const person = toPerson(p, "local");
    if (person) byId.set(p.user_id, person);
  }

  return rows
    .filter((r) => byId.has(r.host))
    .map((r) => {
      const mine = people.find((p) => p.hangout_id === r.id && p.user_id === me);
      return {
        id: r.id,
        title: r.title,
        place: r.place,
        startsAt: new Date(r.starts_at).toISOString(),
        note: r.note,
        open: r.open_to_pals,
        host: byId.get(r.host)!,
        isHost: r.host === me,
        myStatus: mine?.status ?? null,
        invitedMeBy: mine?.invited_by && mine.invited_by !== r.host ? byId.get(mine.invited_by)?.name : undefined,
        people: people
          .filter((p) => p.hangout_id === r.id && byId.has(p.user_id))
          .map((p) => ({ person: byId.get(p.user_id)!, status: p.status, invitedBy: p.invited_by ? byId.get(p.invited_by)?.name : undefined })),
      };
    });
}
