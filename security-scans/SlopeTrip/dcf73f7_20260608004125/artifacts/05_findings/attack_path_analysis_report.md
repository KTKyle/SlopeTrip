# Attack Path Analysis Report

`CAND-CRON-001` was the highest-severity pre-fix issue: a deployment with `SUPABASE_SERVICE_ROLE_KEY` configured but `CRON_SECRET` missing allowed unauthenticated POST requests to write public condition rows through a service-role client. The fix rejects missing or incorrect secrets before creating the service client.

`CAND-RLS-001` created the broadest data-boundary issue: public-share RLS let anon/authenticated Supabase clients enumerate all public trip rows/stops and exposed share tokens and metadata beyond token holders. The fix removes broad public table policies, moves public share reads to a server-only token lookup, and adds explicit owner filters to current-user queries/mutations.

`CAND-AI-001` and `CAND-BODY-001` combined into an abuse path against public recommendation/chat/matrix endpoints. Header rotation could bypass in-memory per-IP buckets, and large request bodies could be parsed before Zod limits. Fixes add safer default identity keying and early body-size rejection; README still notes that production should use shared durable rate limiting.

`CAND-AIPRIV-001`, `CAND-ERR-001`, and `CAND-VAL-001` had lower severity but real user-safety impact. They are fixed through model-context minimization, stable generic UI errors, and stricter validation.

Residual deferred work is limited to self-owned saved recommendation authenticity and external dependency/live Supabase advisor checks that were intentionally excluded by the local-only scan constraint.
