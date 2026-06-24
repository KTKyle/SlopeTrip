# Reviewed Surfaces

Reviewed at full-file level:

- Next.js public pages, app shell, trip pages, login/onboarding/profile pages, public share page, planner, resort map, and UI primitives.
- API routes for resorts, route matrix, recommendations, chat, saved trips, item mutation, sharing, duplication, and condition sync.
- Supabase server/browser helpers, auth helpers, data helpers, Server Actions, migrations, and seed data.
- Local recommendation, Gemini integration, validation schemas, body parsing, observability, rate limiting, geocoding, conditions, route estimates, resort metadata, package metadata, config, and README.

Explicitly excluded:

- `.env.local` and any real local secrets.
- `.git`, `.next`, `node_modules`, build/cache artifacts, and generated scan artifacts.
- External advisory services, npm audit, and live Supabase advisors per local-only instruction.
