# SlopeTrip

SlopeTrip is a full-stack ski trip planner built with Next.js, Supabase, Vercel, Leaflet/OpenStreetMap, and Gemini-ready recommendations.

## What is implemented

- Map-first resort explorer with Leaflet, OpenStreetMap tiles, and curated US resort seed data
- Trip planning screen with budget, day count, skill level, rentals, and recommendation generation
- Pass-aware ticket estimates, editable lodging/food/fuel/parking/rental-car assumptions, and recommendation explanations
- Supabase Auth helpers and profile onboarding flow
- Supabase Postgres schema with RLS policies for user data protection
- Saved trip dashboard with rename, duplicate, archive, delete, edit-in-planner, and public read-only share links
- API routes for resorts, resort details, free route estimates, trip recommendations, saved trips, sharing, duplication, and condition sync
- Local recommendation engine with Gemini fallback support when `GEMINI_API_KEY` is configured
- Privacy and terms pages for audience-facing trust

## Local setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in keys as they become available.

Public browser keys:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-only secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `CRON_SECRET`

## Maps

SlopeTrip uses Leaflet with OpenStreetMap raster tiles, so no Google Maps key or billing account is required. The app includes OpenStreetMap attribution on the map. For high-traffic production use, review the OpenStreetMap tile usage policy and consider a dedicated tile provider or self-hosted tiles.

## Supabase

Apply `supabase/migrations/20260606150000_initial_schema.sql`, then seed resorts with `supabase/seed.sql`.

Every exposed table has RLS enabled. User-owned profile, gear, trip, stop, and AI recommendation rows are scoped to `auth.uid()`. Resort and condition tables are public read-only.

Generated planner results can be saved by authenticated users. Saved trips write to `trips`, `trip_stops`, and `ai_trip_recommendations`; unauthenticated users can still generate demo recommendations but are prompted to log in before saving.

Saved trips can be listed at `/trips`, reopened in the planner as a new version, archived, duplicated, deleted, or published with a read-only share token. Public share links are resolved server-side by exact token using the service role key so public Supabase table reads cannot enumerate shared itineraries.

The professionalization migration adds pass ownership, trip status/versioning, share tokens, origin coordinates, cost assumptions, and AI prompt/fallback metadata.

## Conditions sync

`POST /api/conditions/sync` inserts fresh condition snapshots into `resort_conditions` using the server-only service role key. The route fails closed unless `CRON_SECRET` is configured and the scheduler sends `Authorization: Bearer <secret>`.

The current sync implementation is deterministic sample data shaped like an external provider feed. Replace `buildConditionSyncSnapshot` with a real provider integration before presenting conditions as live resort data.

## Production notes

The built-in rate limiter is an in-memory guard for local and single-process deployments. By default it does not trust client-supplied forwarding headers; set `TRUST_PROXY_RATE_LIMIT_HEADERS=true` only behind a proxy that overwrites `x-forwarded-for`/`x-real-ip`. For horizontally scaled production hosting, replace it with shared storage such as Upstash Redis, Vercel KV, or a Supabase-backed limiter. Recommendation, chat, and route APIs emit structured logs and rate-limit headers, but production observability should forward logs to a managed service.

If the local global `npm` launcher is broken, the project can still be checked with the installed package entrypoints:

```bash
"%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" .\node_modules\eslint\bin\eslint.js
"%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" .\node_modules\vitest\vitest.mjs run
"%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" .\node_modules\next\dist\bin\next build --turbopack
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test
```
