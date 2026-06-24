# Pre-Validation JSON Body Exhaustion Validation

Validated by shared parseJsonBody calling request.json before Zod. Fixed with Content-Length limit and route status propagation; test covers 413.
