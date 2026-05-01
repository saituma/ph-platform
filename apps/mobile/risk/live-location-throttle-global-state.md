# Live Location Throttle Uses Global Module State

## Severity
Medium

## Risk
Live-location send throttling is tracked in module-level state and not scoped per user/run session.

## Evidence
- `apps/mobile/lib/backgroundTask.ts:13` defines `lastLocationSentAt` as a module-global variable.

## Impact
After user switches or rapid run restarts in the same JS session, first location sends can be delayed unexpectedly due to stale throttle timestamp.

## Recommendation
Scope throttling by run ID and/or authenticated user ID, and reset on run start/stop boundaries.
