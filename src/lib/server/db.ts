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
    await sql`alter table hangout_people add column if not exists invited_by text`;
    await sql`alter table hangouts add column if not exists changed_at timestamptz`;
    await sql`alter table hangouts add column if not exists change_note text`;
    // Suggested changes (new time / place / idea) that people can 👍 and the host can accept.
    await sql`create table if not exists hangout_proposals (
      id bigserial primary key,
      hangout_id bigint not null references hangouts (id) on delete cascade,
      proposer text not null,
      starts_at timestamptz,
      place text,
      title text,
      note text not null default '',
      status text not null default 'open' check (status in ('open', 'accepted', 'dismissed')),
      created_at timestamptz not null default now()
    )`;
    await sql`create index if not exists hangout_proposals_hangout on hangout_proposals (hangout_id, status)`;
    await sql`create table if not exists hangout_votes (
      proposal_id bigint not null references hangout_proposals (id) on delete cascade,
      user_id text not null,
      primary key (proposal_id, user_id)
    )`;
    // ---- live town: presence, chat, hang spots, safety ----
    await sql`create table if not exists presence (
      user_id text primary key,
      place text not null default 'town',
      x real not null default 50,
      y real not null default 75,
      lat double precision,
      lng double precision,
      updated_at timestamptz not null default now()
    )`;
    await sql`create index if not exists presence_live on presence (updated_at)`;
    await sql`create table if not exists messages (
      id bigserial primary key,
      conv text not null,
      from_user text not null,
      body text not null,
      created_at timestamptz not null default now()
    )`;
    await sql`create index if not exists messages_conv on messages (conv, id)`;
    await sql`create table if not exists spots (
      id bigserial primary key,
      kind text not null check (kind in ('cafe', 'taphouse', 'arcade', 'park')),
      created_by text not null,
      created_at timestamptz not null default now()
    )`;
    await sql`create table if not exists spot_members (
      spot_id bigint not null references spots (id) on delete cascade,
      user_id text not null,
      status text not null check (status in ('invited', 'joined', 'left', 'declined')),
      invited_by text,
      updated_at timestamptz not null default now(),
      primary key (spot_id, user_id)
    )`;
    await sql`create index if not exists spot_members_user on spot_members (user_id, status)`;
    await sql`create table if not exists blocks (
      blocker text not null,
      blocked text not null,
      created_at timestamptz not null default now(),
      primary key (blocker, blocked)
    )`;
    await sql`create table if not exists reports (
      id bigserial primary key,
      reporter text not null,
      reported text not null,
      reason text not null default '',
      context text not null default '',
      created_at timestamptz not null default now()
    )`;
    // ---- calendars: only busy times are stored, never event details ----
    await sql`create table if not exists calendars (
      user_id text primary key,
      kind text not null check (kind in ('google', 'ics')),
      ics_url_enc text,
      share_with_pals boolean not null default true,
      connected_at timestamptz not null default now(),
      synced_at timestamptz,
      error text
    )`;
    await sql`create table if not exists busy (
      user_id text not null,
      starts timestamptz not null,
      ends timestamptz not null
    )`;
    await sql`create index if not exists busy_user on busy (user_id, starts)`;
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
