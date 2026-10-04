import "server-only";
import type { AppState, Connections } from "@/lib/state";
import { milesBetweenCoords, placeCoords } from "@/lib/towns";
import type { Contact, Search, Townsperson } from "@/lib/types";
import { sql } from "./db";

/** How far (miles) counts as "in town" for locals and visitors. */
const RADIUS_MILES = 40;

type ProfileRow = {
  user_id: string;
  state: AppState;
  home_lat: number | null;
  home_lng: number | null;
  trip_label: string | null;
  trip_lat: number | null;
  trip_lng: number | null;
};

/** The public face of a user — what other people's pals see. Never includes contact details. */
export function toPerson(row: ProfileRow, as: "local" | "visitor" = row.trip_lat !== null ? "visitor" : "local"): Townsperson | null {
  const s = row.state;
  if (!s.persona) return null;
  const first = s.basics.name.trim().split(/\s+/)[0] || "Someone";
  const home = s.basics.location?.label?.split(",")[0] || "nearby";
  const visiting = as === "visitor" && row.trip_label && row.trip_lat !== null ? { from: home, until: "" } : undefined;
  return {
    id: row.user_id,
    name: first,
    gender: s.basics.gender,
    age: s.basics.age,
    town: visiting ? `${row.trip_label!.split(",")[0]} (visiting)` : home,
    occupation: s.persona.archetype,
    bio: `${s.persona.archetype}. Into ${s.persona.interests.slice(0, 3).join(", ") || "meeting new people"}.`,
    lifeStageTags: s.persona.lifeStageTags.length ? s.persona.lifeStageTags : s.basics.lifeStage,
    interests: s.persona.interests,
    values: s.persona.values,
    traits: s.persona.traits,
    look: s.look,
    contact: {},
    lat: (visiting ? row.trip_lat : row.home_lat) ?? undefined,
    lng: (visiting ? row.trip_lng : row.home_lng) ?? undefined,
    visiting,
  };
}

/** Columns we keep in sync with the profile JSON so we can query by place. */
export function placeColumns(state: AppState) {
  const home = placeCoords(state.basics.location);
  const trip = state.search.mode === "trip" ? placeCoords(state.search.destination) : null;
  return {
    onboarded: !!state.persona,
    home_lat: home?.[0] ?? null,
    home_lng: home?.[1] ?? null,
    trip_label: trip ? (state.search.destination?.label ?? null) : null,
    trip_lat: trip?.[0] ?? null,
    trip_lng: trip?.[1] ?? null,
  };
}

/** Real users your pal can meet for a search: locals living near the place and/or people visiting it. */
export async function peopleFor(me: string, search: Search, center: [number, number] | null): Promise<Townsperson[]> {
  if (!center) return [];
  const [lat, lng] = center;
  // Bounding box first (cheap, indexed), exact distance in JS.
  const dLat = RADIUS_MILES / 69;
  const dLng = RADIUS_MILES / (69 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const wantLocals = search.who !== "visitors";
  const wantVisitors = search.who !== "locals";

  const rows = (await sql`
    select user_id, state, home_lat, home_lng, trip_label, trip_lat, trip_lng from profiles
    where onboarded and user_id <> ${me} and (
      (${wantLocals} and home_lat between ${lat - dLat} and ${lat + dLat} and home_lng between ${lng - dLng} and ${lng + dLng})
      or (${wantVisitors} and trip_lat between ${lat - dLat} and ${lat + dLat} and trip_lng between ${lng - dLng} and ${lng + dLng})
    )
    order by updated_at desc
    limit 300`) as ProfileRow[];

  const near = (la: number | null, ln: number | null) => la !== null && ln !== null && milesBetweenCoords(center, [la, ln]) <= RADIUS_MILES;
  const people: Townsperson[] = [];
  for (const row of rows) {
    // Someone can be both (lives here, also "visiting" here) — treat them as a visitor only if they're actually away from home.
    const visitorHere = wantVisitors && near(row.trip_lat, row.trip_lng) && !near(row.home_lat, row.home_lng);
    const localHere = wantLocals && near(row.home_lat, row.home_lng);
    const p = visitorHere ? toPerson(row, "visitor") : localHere ? toPerson(row, "local") : null;
    if (p) people.push(p);
  }
  return people;
}

export async function connectionsFor(me: string): Promise<Connections> {
  const mineRows = (await sql`select to_user, decision from decisions where from_user = ${me}`) as { to_user: string; decision: "yes" | "no" }[];
  const mine = Object.fromEntries(mineRows.map((r) => [r.to_user, r.decision]));

  // People who said yes to me…
  const theirs = (await sql`
    select p.user_id, p.state, p.home_lat, p.home_lng, p.trip_label, p.trip_lat, p.trip_lng
    from decisions d join profiles p on p.user_id = d.from_user
    where d.to_user = ${me} and d.decision = 'yes'`) as ProfileRow[];

  const incoming: Townsperson[] = [];
  const friends: Townsperson[] = [];
  const contacts: Record<string, Contact> = {};
  for (const row of theirs) {
    if (mine[row.user_id] === "yes") {
      // …mutual: you're pals, unlock contact
      contacts[row.user_id] = row.state.basics.contact ?? {};
      const p = toPerson(row, "local");
      if (p) friends.push(p);
    } else if (!mine[row.user_id]) {
      const p = toPerson(row);
      if (p) incoming.push(p); // …waiting on my answer
    }
  }
  return { mine, incoming, contacts, friends };
}
