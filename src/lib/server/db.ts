import "server-only";
import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);

let schema: Promise<unknown> | null = null;

/** Creates tables on first use (idempotent). Cached per server instance. */
export function ensureSchema() {
  schema ??= (async () => {
    await sql`create table if not exists profiles (
      user_id text primary key,
      state jsonb not null,
      onboarded boolean not null default false,
      home_lat double precision,
      home_lng double precision,
      trip_label text,
      trip_lat double precision,
      trip_lng double precision,
      updated_at timestamptz not null default now()
    )`;
    await sql`create index if not exists profiles_home on profiles (home_lat, home_lng) where onboarded`;
    await sql`create index if not exists profiles_trip on profiles (trip_lat, trip_lng) where onboarded and trip_lat is not null`;
    await sql`create table if not exists trips (
      user_id text not null,
      key text not null,
      data jsonb not null,
      updated_at timestamptz not null default now(),
      primary key (user_id, key)
    )`;
    await sql`create table if not exists decisions (
      from_user text not null,
      to_user text not null,
      decision text not null check (decision in ('yes', 'no')),
      created_at timestamptz not null default now(),
      primary key (from_user, to_user)
    )`;
    await sql`create index if not exists decisions_to on decisions (to_user)`;
    await sql`create table if not exists hangouts (
      id bigserial primary key,
      host text not null,
      title text not null,
      place text not null default '',
      starts_at timestamptz not null,
      note text not null default '',
      open_to_pals boolean not null default true,
      created_at timestamptz not null default now()
    )`;
    await sql`create index if not exists hangouts_host on hangouts (host, starts_at)`;
    await sql`create table if not exists hangout_people (
      hangout_id bigint not null references hangouts (id) on delete cascade,
      user_id text not null,
      status text not null check (status in ('invited', 'going', 'maybe', 'declined')),
      updated_at timestamptz not null default now(),
      primary key (hangout_id, user_id)
    )`;
    await sql`create index if not exists hangout_people_user on hangout_people (user_id)`;
    await sql`create table if not exists usage (
      user_id text not null,
      day date not null default current_date,
      kind text not null,
      count integer not null default 0,
      primary key (user_id, day, kind)
    )`;
  })().catch((e) => {
    schema = null; // retry on next request
    throw e;
  });
  return schema;
}
