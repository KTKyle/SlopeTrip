# SlopeTrip

SlopeTrip is a full-stack ski trip planner built with Next.js, Supabase, Vercel, Leaflet/OpenStreetMap, and Gemini-ready recommendations.

## What is implemented

- Map-first resort explorer with Leaflet, OpenStreetMap tiles, and curated US resort seed data
- Trip planning screen with budget, day count, skill level, rentals, and recommendation generation
- Supabase Auth helpers and profile onboarding flow
- Supabase Postgres schema with RLS policies for user data protection
- API routes for resorts, resort details, free route estimates, trip recommendations, and saved trips
- Local recommendation engine with Gemini fallback support when `GEMINI_API_KEY` is configured

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

## Maps

SlopeTrip uses Leaflet with OpenStreetMap raster tiles, so no Google Maps key or billing account is required. The app includes OpenStreetMap attribution on the map. For high-traffic production use, review the OpenStreetMap tile usage policy and consider a dedicated tile provider or self-hosted tiles.

## Supabase

Apply `supabase/migrations/20260606150000_initial_schema.sql`, then seed resorts with `supabase/seed.sql`.

Every exposed table has RLS enabled. User-owned profile, gear, trip, stop, and AI recommendation rows are scoped to `auth.uid()`. Resort and condition tables are public read-only.

Generated planner results can be saved by authenticated users. Saved trips write to `trips`, `trip_stops`, and `ai_trip_recommendations`; unauthenticated users can still generate demo recommendations but are prompted to log in before saving.

## Production notes

The built-in rate limiter is an in-memory guard for local and single-process deployments. For horizontally scaled production hosting, replace it with shared storage such as Upstash Redis, Vercel KV, or a Supabase-backed limiter.

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
