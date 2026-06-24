# SlopeTrip Codex Security Report

Scan id: `dcf73f7_20260608004125`

Scope: full repository source/config/migration/package metadata worklist, local-only. Generated/build/dependency folders, scan artifacts, `.git`, `.next`, `node_modules`, and `.env.local` were excluded.

## Executive Summary

The scan found and fixed seven reportable security hardening issues. The most important fixes were:

- Public trip sharing is no longer backed by broad anon/authenticated Supabase table policies. Shared trips are now resolved server-side by exact token, and current-user trip helpers explicitly filter by `user_id`.
- The service-role conditions sync route now fails closed unless `CRON_SECRET` is configured and supplied as a bearer token.
- Public recommendation, chat, and route APIs no longer trust spoofable forwarding headers by default for rate-limit keys.
- JSON request bodies can be rejected before parsing when `Content-Length` exceeds the default 64KB limit.
- Gemini prompt context no longer includes origin-derived `Drive fit` factors.
- Login/trip pages no longer reflect raw decoded error strings.
- Share toggles and resort identifiers now have stricter validation before persistence.

One low-risk product-integrity item remains deferred: signed/server-bound recommendation saves. Authenticated users can still save schema-valid self-owned itinerary content, but RLS confines that impact to their own rows.

## Fixed Findings

### CAND-RLS-001: Public Share Enumeration

Severity: Medium.

Public share policies allowed anon/authenticated Supabase clients to select every trip where `is_public = true` and `share_token is not null`, plus matching trip stops. Current-user helpers also lacked explicit owner filters in some paths.

Fixes:

- Added `supabase/migrations/20260608123000_token_gate_public_shares.sql` to drop broad public share policies.
- Changed `getPublicTripByShareToken()` to use server-only service-role lookup with token format validation.
- Added explicit `.eq("user_id", user.id)` filters to current-user list, detail, source-trip, duplicate, update, delete, and share helpers.

### CAND-CRON-001: Fail-Open Service-Role Sync

Severity: High under misconfigured production.

`POST /api/conditions/sync` only rejected unauthorized requests when `CRON_SECRET` was truthy, then created a service-role client and inserted public condition rows.

Fixes:

- Route now returns `503` when `CRON_SECRET` is missing.
- Route rejects invalid/missing bearer tokens before service client creation.
- Added tests for missing secret, unauthorized request, and authorized insert.

### CAND-AI-001: Spoofable Rate-Limit Identity

Severity: Medium.

Recommendation, chat, and route APIs keyed rate limits from `x-forwarded-for`, which can be attacker-controlled outside a trusted proxy.

Fixes:

- Added `getRateLimitKey()` with a safe global default.
- Added `TRUST_PROXY_RATE_LIMIT_HEADERS=false` default and README guidance.
- Updated public API routes to use the helper and keep rate-limit headers.

### CAND-BODY-001: Oversized JSON Parsing

Severity: Medium.

Routes parsed JSON before schema bounds, allowing avoidable memory/CPU work on oversized anonymous requests.

Fixes:

- Added a 64KB default `Content-Length` guard in `parseJsonBody()`.
- Routes now propagate `413` for oversized bodies.
- Added tests for oversized recommendation payload rejection.

### CAND-AIPRIV-001: Gemini Prompt Minimization

Severity: Low privacy issue.

The Gemini prompt described anonymized context but included the full local recommendation, including `Drive fit` factors derived from home coordinates.

Fix:

- Added `sanitizeRecommendationForModel()` and removed `Drive fit` factors from model context.

### CAND-ERR-001: Raw Error Reflection

Severity: Low.

Login/trip pages decoded and displayed raw query error strings; malformed encodings could throw, and raw provider/DB messages could disclose details.

Fixes:

- Added stable user-facing error mapping.
- Updated Server Actions to redirect with generic codes.
- Pages render safe mapped messages.

### CAND-VAL-001: Loose Share and Resort Validation

Severity: Low.

`z.coerce.boolean()` treated `"false"` as `true`, and resort ids lacked max bounds/existence checks before trip persistence.

Fixes:

- Share API now requires strict JSON booleans.
- Resort ids are bounded.
- Saved-trip stops must reference known resorts and valid days before parent trip insert.

## Deferred / Residual Risk

- `DEFER-SELF-SAVE-001`: Authenticated users can still save schema-valid self-owned itinerary content without a signed server-generated recommendation id. This is deferred because it does not cross user boundaries and requires a larger server-generated recommendation/session design.
- Dependency CVE checks and live Supabase advisors were intentionally not run under the local-only constraint.
- `next build --turbopack` could not complete because an existing OneDrive reparse-point directory under `.next/server/app/api/conditions` could not be unlinked. TypeScript, lint, and unit tests passed.

## Verification

- `.\node_modules\.bin\tsc.cmd --noEmit`: passed.
- `.\node_modules\.bin\vitest.cmd run`: passed, 9 files / 35 tests.
- `.\node_modules\.bin\eslint.cmd .`: passed.
- `.\node_modules\.bin\next.cmd build --turbopack`: blocked by Windows/OneDrive `EPERM` unlink on generated `.next` path, not by a code compile error observed in the earlier checks.

## Artifact Index

- Threat model: `artifacts/01_context/threat_model.md`
- Seed research: `artifacts/01_context/seed_research.md`
- Discovery report: `artifacts/02_discovery/finding_discovery_report.md`
- Work ledger: `artifacts/02_discovery/work_ledger.jsonl`
- Coverage ledger: `artifacts/03_coverage/repository_coverage_ledger.md`
- Dedupe report: `artifacts/04_reconciliation/dedupe_report.md`
- Validation summary: `artifacts/05_findings/validation_summary.md`
- Attack-path summary: `artifacts/05_findings/attack_path_analysis_report.md`
