# Fail-Open Condition Sync Validation

Validated by route check that only rejected mismatched tokens when CRON_SECRET was truthy before service-role insert. Fixed by requiring a non-empty secret before creating the service client.
