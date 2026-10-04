# Wanderpals

Build a little you, tell it who you are, and it wanders around town meeting real people in your season of life — then suggests a first hang.

## Stack

- Next.js 16 (App Router) on Vercel
- **Clerk** for sign-in, **Neon Postgres** for profiles / trips / connections (both via Vercel Marketplace)
- **Claude** (AI SDK) for reading selfies, building the persona, and ranking matches — with rule-based fallbacks
- **Google Maps** Places + Geocoding for town search and "use my location" (optional)
- Remotion for the promo video

## Run locally

```bash
npm install
vercel link            # once, to the wanderpals project
vercel env pull        # pulls Clerk + Neon keys into .env.local
npm run dev
```

Then add `ANTHROPIC_API_KEY` (and optionally `GOOGLE_MAPS_API_KEY`) to `.env.local` — see `.env.example`.
Database tables are created automatically on first request.

## Deploy

```bash
vercel          # preview
vercel --prod   # production
```

All env vars must exist in the Vercel project (Marketplace ones are added automatically).

## How it works

- `/` — public landing page. `/sign-in`, `/sign-up` — Clerk. `/app` — the app (requires sign-in, enforced in `src/proxy.ts`).
- Onboarding: basics → avatar → quiz or voice → persona → town. Saved to `profiles` as you go.
- Matching (`/api/matches`): real users whose home (locals) or current trip destination (visitors) is within 40 miles, scored by `src/lib/match.ts`, re-ranked by Claude. Friend groups are 3–4 people who all score well with each other.
- Connections (`/api/connections`): saying hi records a yes. Contact details are only shared once **both** people say yes.
- Paid APIs are rate-limited per user per day (`src/lib/server/session.ts`).

## Promo video

`npm run video` opens Remotion Studio; `npm run video:render` renders `marketing/*.mp4` (copy the widescreen one to `public/promo.mp4` for the landing page).
