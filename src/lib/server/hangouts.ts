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

type Row = { id: string; host: string; title: string; place: string; starts_at: string; note: string; open_to_pals: boolean; changed_at: string | null; change_note: string | null };

/** Hangouts you can see: yours, ones you're on, and open ones hosted by your pals. Recent past ones stay visible for a day. */
export async function visibleHangouts(me: string, onlyId?: string): Promise<Hangout[]> {
  const pals = await palIds(me);
  const rows = (await sql`
    select h.id::text, h.host, h.title, h.place, h.starts_at, h.note, h.open_to_pals, h.changed_at, h.change_note from hangouts h
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
  const proposals = (await sql`
    select p.id::text, p.hangout_id::text, p.proposer, p.starts_at, p.place, p.title, p.note,
      coalesce(array_agg(v.user_id) filter (where v.user_id is not null), '{}') as voters
    from hangout_proposals p left join hangout_votes v on v.proposal_id = p.id
    where p.hangout_id = any(${ids}::bigint[]) and p.status = 'open'
    group by p.id order by p.created_at`) as {
    id: string;
    hangout_id: string;
    proposer: string;
    starts_at: string | null;
    place: string | null;
    title: string | null;
    note: string;
    voters: string[];
  }[];
  const userIds = [
    ...new Set([...rows.map((r) => r.host), ...people.flatMap((p) => [p.user_id, p.invited_by ?? []].flat()), ...proposals.flatMap((p) => [p.proposer, ...p.voters])]),
  ];
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
          .map((p) => ({ person: byId.get(p.user_id)!, status: p.status, invitedBy: p.invited_by ? byId.get(p.invited_by)?.name : undefined, isYou: p.user_id === me })),
        proposals: proposals
          .filter((p) => p.hangout_id === r.id && byId.has(p.proposer))
          .map((p) => ({
            id: p.id,
            proposer: byId.get(p.proposer)!,
            mine: p.proposer === me,
            startsAt: p.starts_at ? new Date(p.starts_at).toISOString() : undefined,
            place: p.place ?? undefined,
            title: p.title ?? undefined,
            note: p.note,
            votes: p.voters.length,
            iVoted: p.voters.includes(me),
            voters: p.voters.map((v) => (v === me ? "you" : (byId.get(v)?.name ?? "someone"))),
          }))
          .sort((a, b) => b.votes - a.votes),
        changed: r.changed_at ? { at: new Date(r.changed_at).toISOString(), note: r.change_note ?? "" } : undefined,
      };
    });
}

export type Change = { title?: string; place?: string; startsAt?: string; note?: string };

/**
 * Apply a change to a hangout. If the time moves, people who were going/maybe get asked again —
 * except `stillGoing` (the host, whoever suggested it, and everyone who 👍'd it), who are marked going.
 */
export async function applyChange(hangoutId: string, host: string, change: Change, stillGoing: string[]) {
  const [before] = (await sql`select title, place, starts_at from hangouts where id = ${hangoutId}::bigint`) as { title: string; place: string; starts_at: string }[];
  if (!before) return;
  const timeChanged = !!change.startsAt && new Date(change.startsAt).getTime() !== new Date(before.starts_at).getTime();
  const what = [
    timeChanged && "time",
    change.place !== undefined && change.place !== before.place && "place",
    change.title !== undefined && change.title !== before.title && "plan",
  ].filter(Boolean) as string[];
  if (!what.length && change.note === undefined) return;

  await sql`
    update hangouts set
      title = coalesce(${change.title ?? null}, title),
      place = coalesce(${change.place ?? null}, place),
      starts_at = coalesce(${change.startsAt ?? null}::timestamptz, starts_at),
      note = coalesce(${change.note ?? null}, note),
      changed_at = ${what.length ? new Date().toISOString() : null}::timestamptz,
      change_note = ${what.join(",") || null}
    where id = ${hangoutId}::bigint`;

  if (timeChanged) {
    const keep = [...new Set([host, ...stillGoing])];
    await sql`
      update hangout_people set status = 'invited', updated_at = now()
      where hangout_id = ${hangoutId}::bigint and status in ('going', 'maybe') and not (user_id = any(${keep}::text[]))`;
    for (const id of keep)
      await sql`
        insert into hangout_people (hangout_id, user_id, status) values (${hangoutId}::bigint, ${id}, 'going')
        on conflict (hangout_id, user_id) do update set status = 'going', updated_at = now()`;
  }
}
