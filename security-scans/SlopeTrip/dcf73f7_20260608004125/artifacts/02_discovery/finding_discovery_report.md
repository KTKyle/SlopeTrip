# Finding Discovery Report

Scan target: full SlopeTrip repository source scope.

Mode: local-only, no `.env.local`, no npm registry audit, no Supabase live advisors.

Worklist:

- `rank_input.csv`: 69 in-scope product, config, test, migration, and package metadata files after excluding generated/build/dependency/scan-artifact paths.
- `deep_review_input.csv`: same 69 rows, reviewed at 100% coverage.
- `work_ledger.jsonl`: 69 completion receipts.

Plausible candidates discovered:

- `CAND-RLS-001`: Public share RLS/current-user helper exposure.
- `CAND-CRON-001`: Fail-open service-role condition sync.
- `CAND-AI-001`: Spoofable forwarded-IP rate-limit family.
- `CAND-BODY-001`: Oversized JSON parsed before schema bounds.
- `CAND-AIPRIV-001`: Gemini prompt origin-derived signal exposure.
- `CAND-ERR-001`: Raw/unsafe reflected error display.
- `CAND-VAL-001`: Loose share/resort-id validation.
- `DEFER-SELF-SAVE-001`: Self-owned generated trip authenticity, deferred as low-risk product-integrity work.

No RCE, SQL injection, command execution, SSRF, file/path traversal, unsafe deserialization, or stored XSS candidates survived discovery.
