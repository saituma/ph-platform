# No Server Run Pull Invocation

## Severity
High

## Risk
Bidirectional run sync is defined but never invoked from app flows; only push is called.

## Evidence
- `apps/mobile/lib/runSync.ts:92` defines `pullRunsFromCloud`.
- `apps/mobile/lib/runSync.ts:138` defines `syncRuns` (push + pull).
- No call sites found for `pullRunsFromCloud` or `syncRuns` in `apps/mobile`.
- Only `pushRunsToCloud` is called from:
  - `apps/mobile/app/(tabs)/tracking/active-run.tsx:279`
  - `apps/mobile/app/(tabs)/tracking/summary.tsx:193`
  - `apps/mobile/app/(tabs)/tracking/feedback.tsx:115`

## Impact
Runs created/edited on another device may never appear locally.

## Recommendation
Invoke `syncRuns()` at authenticated startup and at strategic foreground/resume points.
