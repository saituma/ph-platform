# Fire-And-Forget Run Sync Loss Window

## Severity
Medium

## Risk
Run sync is triggered without awaiting completion right after user actions.

## Evidence
- `pushRunsToCloud()` called without `await` in:
  - `apps/mobile/app/(tabs)/tracking/active-run.tsx:279`
  - `apps/mobile/app/(tabs)/tracking/summary.tsx:193`
  - `apps/mobile/app/(tabs)/tracking/feedback.tsx:115`

## Impact
If app is backgrounded/killed immediately, writes may remain unsynced longer than expected.

## Recommendation
Queue durable background sync jobs or await critical sync on key transitions where UX permits.
