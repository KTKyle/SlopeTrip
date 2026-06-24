# SlopeTrip Repository Threat Model

## Overview

SlopeTrip is a full-stack Next.js ski trip planning app. The deployed runtime exposes browser pages, Next.js Route Handlers, Server Actions, Supabase Auth-backed account flows, Supabase Postgres tables with RLS policies, Leaflet/OpenStreetMap map display, deterministic local recommendations, optional Gemini model calls, and a server-only condition sync route.

Primary runtime code lives under `src/app`, `src/components`, `src/lib`, and `supabase/migrations`. Generated output, installed dependencies, and local environment files are not product code. The app stores user preferences, home-location labels and coarse coordinates, saved trips, trip stops, AI recommendation inputs/results, and public share tokens. It also exposes public resort and condition data.

The most important security properties are:

- Authenticated users can read and mutate only their own private profile, gear, trips, trip stops, and AI recommendation rows.
- Public share links disclose only explicitly published read-only trip plans and become inaccessible when sharing is turned off.
- Server-only secrets such as `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and `CRON_SECRET` never reach browser bundles, logs, public responses, or public pages.
- AI prompts receive only intended, minimized trip context and model responses do not become trusted executable content.
- Expensive routes and privileged routes are protected from anonymous abuse, replay, and accidental open access.

## Threat Model, Trust Boundaries, and Assumptions

Actors:

- Anonymous visitors can browse public pages, call unauthenticated public APIs, generate demo recommendations, use route estimates, chat with the trip assistant, and open public share links.
- Authenticated users can create profiles and save, edit, duplicate, archive, delete, and share their own trips.
- Public share recipients can read a published itinerary by unguessable token but should not edit it or infer owner-private profile details.
- Operators configure environment variables, Supabase migrations, deployment settings, and scheduled condition sync calls.
- External services include Supabase Auth/Postgres, Gemini, and OpenStreetMap tile servers.

Trust boundaries:

- Browser-to-Route Handler and browser-to-Server Action boundaries accept attacker-controlled requests, form fields, JSON, path params, and headers.
- Supabase RLS is the database tenant boundary for user-owned data. Application helpers should not rely on client-provided user ids.
- Public share-token access crosses from private user-owned trip data to intentionally public read-only views.
- Service-role Supabase access crosses into an elevated database privilege boundary and must be reachable only from trusted scheduler/operator calls.
- Gemini calls cross to an external AI provider; prompts and responses are untrusted for privacy, accuracy, and policy purposes.
- Logs cross from runtime code to operator-visible observability and must avoid secrets and unnecessary sensitive user data.

Attacker-controlled inputs include route params, query strings, JSON bodies, form data, message text, trip titles and stop notes when stored, selected resort ids, budget assumptions, headers such as `x-forwarded-for`, public share tokens, and malformed payloads. Operator-controlled inputs include environment variables, cron Authorization headers, and Supabase project configuration. Developer-controlled inputs include migrations, seed data, static resort data, package versions, and source code.

Assumptions:

- Supabase Auth issues and validates session cookies according to the `@supabase/ssr` helpers.
- The anon Supabase key is public by design; RLS policies are responsible for preventing cross-user access.
- The service-role key bypasses RLS and must stay server-only.
- The app is likely deployed on a managed Next.js platform such as Vercel, but local development remains supported.
- The current in-memory rate limiter is a local or single-process control, not a complete horizontally scaled production control.

## Attack Surface, Mitigations, and Attacker Stories

High-value surfaces:

- `src/app/api/trips/**` and `src/lib/supabase/data.ts` create, update, delete, duplicate, and share saved trips.
- `src/app/share/[token]/page.tsx` and public RLS policies expose read-only shared itineraries.
- `supabase/migrations/*.sql` define RLS policies for user-owned and public-read tables.
- `src/app/api/conditions/sync/route.ts` uses the service-role client for condition writes.
- `src/app/api/trips/recommend/route.ts`, `src/app/api/trips/chat/route.ts`, `src/lib/gemini.ts`, and `src/lib/validation.ts` handle AI prompts, model outputs, and user-supplied trip context.
- `src/lib/rate-limit.ts` and `src/lib/observability.ts` implement local abuse controls and event logging.
- `next.config.ts`, app layout, and deployment config affect security headers and browser policy.

Existing mitigations:

- Zod schemas constrain major JSON and form payloads.
- Supabase RLS is enabled for exposed tables, with owner-scoped policies for profile, gear, trips, trip stops, and AI recommendations.
- Public resort and condition tables are intended to be read-only.
- Share tokens are generated server-side with cryptographic randomness.
- Gemini recommendation prompts sanitize the home location to a region hint and local scoring remains the source of truth.
- React escapes rendered text by default, and the codebase does not currently use obvious HTML injection APIs.
- Server-only keys are listed separately from public env vars in documentation and accessed only through server-side modules.

Realistic attacker stories:

- A logged-in user tries to mutate or duplicate another user's trip by guessing or obtaining a UUID.
- An anonymous user brute-forces share tokens or tries to access trip stops for a private trip.
- A visitor abuses recommendation, chat, or route-estimate APIs to consume compute or model quota.
- A malicious user submits oversized, malformed, or prompt-injection-style chat/trip payloads.
- A misconfigured deployment leaves the service-role condition sync route callable by the public internet.
- A user-provided trip title, note, or AI text is rendered in a way that could become XSS if escaping changes.
- Logs accidentally include secrets, raw prompts, profile data, or sensitive home-location details.

Out-of-scope or lower-realism stories:

- Direct compromise of Supabase, Gemini, OpenStreetMap, Vercel, or the operator's deployment account.
- Attacks requiring write access to migrations, source code, or production environment variables.
- Native-code compromise through dependency install scripts during local development, except as dependency metadata review.
- Exact live snow/road safety correctness, except where the app represents deterministic sample data or AI output as authoritative.

## Severity Calibration

Critical:

- Any path that exposes `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, session cookies, or other server-only secrets to the browser, public responses, or logs.
- Any unauthenticated or cross-user path that can write through the Supabase service-role client or bypass RLS for user-owned records.
- Any RLS policy or app helper combination that lets one user delete, update, or bulk-read all private trips or profiles.

High:

- Cross-user read/write/delete of a single private trip, profile, trip stop, or AI recommendation.
- Public share-link logic that exposes private trips without an explicit `is_public` state or keeps a disabled share token readable.
- A condition sync route that is reachable without a configured secret in production while using the service-role key.
- Stored XSS in trip titles, notes, share pages, or AI responses if output escapes are bypassed.

Medium:

- Weak abuse controls on AI, route, or sync endpoints that could cause quota exhaustion or operational cost in realistic deployment.
- Logging raw user prompts, precise home locations, or unexpected personal details without a product need.
- Missing security headers that make clickjacking or script-injection impact easier if another bug appears.
- Inadequate validation bounds that allow oversized request bodies or unusually expensive recommendation inputs.

Low:

- Information disclosure limited to public resort seed data or public condition snapshots.
- UI-only issues that do not bypass server-side auth, RLS, or share-token checks.
- Local-only development footguns documented as non-production behavior, provided production defaults are fail-safe.
- Dependency advisories that affect unused transitive code paths without reachable runtime impact.
