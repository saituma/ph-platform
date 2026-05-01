# Optimistic Video Storage Error Suppression

## Severity
Low

## Risk
Optimistic upload persistence/load errors are silently swallowed.

## Evidence
- Read path swallows all errors:
  - `apps/mobile/hooks/programs/useOptimisticVideos.ts:25`
- Write path swallows all errors:
  - `apps/mobile/hooks/programs/useOptimisticVideos.ts:39`

## Impact
State corruption or storage failures become invisible, making recovery/debugging difficult.

## Recommendation
Log structured warnings and fall back to safe state reset behavior when persistence fails.
