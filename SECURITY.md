# Security Policy

## Supported Version

SlopeTrip is pre-1.0. Security fixes apply to the current `main` branch until a formal release policy is created.

## Reporting a Vulnerability

Do not open a public issue for suspected vulnerabilities. Report privately to the repository owner with:

- Affected route, component, API, migration, or dependency
- Reproduction steps or proof of concept
- Expected impact and required privileges
- Suggested remediation, if known

## Security Baseline

- Supabase RLS must remain enabled for user-owned tables.
- Server-only secrets must not be exposed through `NEXT_PUBLIC_*` variables.
- Public APIs must validate JSON bodies with Zod and apply rate limiting.
- Service-role operations must require server-side authorization and fail closed when secrets are missing.
- CI must pass lint, typecheck, tests, production build, and high-severity production dependency audit before launch.
