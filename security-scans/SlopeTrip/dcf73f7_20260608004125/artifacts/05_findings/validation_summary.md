# Validation Summary

Validated and fixed:

- `CAND-RLS-001`: Confirmed via migration policy and helper queries; fixed by dropping public share policies, using server-only exact-token lookup, and adding owner filters.
- `CAND-CRON-001`: Confirmed via fail-open route branch before service-role insert; fixed by requiring configured `CRON_SECRET`.
- `CAND-AI-001`: Confirmed via spoofable `x-forwarded-for` keying; fixed by defaulting to non-proxy global keys unless trusted proxy headers are explicitly enabled.
- `CAND-BODY-001`: Confirmed via `request.json()` before schema checks; fixed with Content-Length rejection and route status propagation.
- `CAND-AIPRIV-001`: Confirmed via `Drive fit` factors in serialized Gemini prompt context; fixed by sanitizing model context.
- `CAND-ERR-001`: Confirmed via raw `decodeURIComponent` page rendering and raw redirects; fixed with mapped safe user-facing errors.
- `CAND-VAL-001`: Confirmed via `z.coerce.boolean()` and unbounded resort ids; fixed with strict booleans, id bounds, and known-resort/day validation.

Deferred:

- `DEFER-SELF-SAVE-001`: Users can still save schema-valid self-owned generated trip content. This is deferred as low-risk product-integrity work because RLS confines impact to the user's own rows and a robust fix needs a signed server-generated recommendation id or server-side recomputation flow.

Suppressed:

- XSS in rendered trip text/AI text: React escaping is used and no dangerous HTML APIs were found.
- SQL/query injection: Supabase query builder uses fixed table/column names and attacker data as values; no raw SQL sink was found.
- File/path traversal, SSRF, command execution, deserialization: no reachable sink in product code.
