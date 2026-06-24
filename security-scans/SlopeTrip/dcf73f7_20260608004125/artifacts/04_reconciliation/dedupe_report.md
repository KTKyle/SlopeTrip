# Dedupe Report

Repository-wide candidate streams from parent review and subagents were deduplicated by root control, source, and impact.

- `CAND-RLS-001` absorbs RLS-001, UI-001, TRIPAPI-001, TRIPAPI-002, and PLANUI-3. These all share the same root public-share table policy and missing owner filters around public trip rows.
- `CAND-CRON-001` absorbs RLS-002. The root issue is the fail-open cron secret check before service-role writes.
- `CAND-AI-001` absorbs AI-001, AI-002, AI-003, and PLANUI-2. The independent endpoints are kept in affected locations, but one helper-level fix controls the family.
- `CAND-BODY-001` absorbs AI-005. It is a shared parser/body-size control issue.
- `CAND-AIPRIV-001` absorbs AI-004. It is a Gemini prompt minimization issue.
- `CAND-ERR-001` absorbs UI-002. It is a reflected error handling issue.
- `CAND-VAL-001` absorbs TRIPAPI-003 and TRIPAPI-004 for strict request validation and pre-insert stop checks.
- `DEFER-SELF-SAVE-001` preserves PLANUI-1 as low-risk deferred product-integrity work because the remaining concern is self-owned content authenticity, not cross-user or privilege-boundary impact.

No independently reachable sibling instances were dropped; repeated rate-limit endpoints and public share entrypoints remain listed inside their deduped findings.
