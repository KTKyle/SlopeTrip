# Spoofable Rate Limit Identity Validation

Validated by route keying from x-forwarded-for and tests showing rotated headers no longer bypass default limit. Fixed by using a global default unless trusted proxy headers are explicitly enabled.
