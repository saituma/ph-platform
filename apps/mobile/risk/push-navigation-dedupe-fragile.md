# Push Navigation Dedupe Is Identifier-Dependent

## Severity
Low

## Risk
Duplicate response handling is deduped only by notification identifier when present.

## Evidence
- `apps/mobile/hooks/navigation/usePushNotificationResponses.ts:133-136`.

## Impact
If identifiers are missing/changed by platform behavior, duplicate navigation/actions can still occur.

## Recommendation
Add secondary dedupe key using payload hash + short time window.
