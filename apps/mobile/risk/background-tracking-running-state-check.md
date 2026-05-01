# Background Tracking Running-State Check

## Severity
High

## Risk
Background location start/stop logic uses task registration as a proxy for whether updates are actively running.

## Evidence
- `apps/mobile/lib/backgroundTask.ts:157` uses `TaskManager.isTaskRegisteredAsync(...)` to early-return from start.
- `apps/mobile/lib/backgroundTask.ts:212` uses the same check before stop.

## Impact
Background tracking can become inconsistent across lifecycle transitions (e.g., appears "already running" when updates are not actually active, or stop path is skipped).

## Recommendation
Use `Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)` for runtime start/stop gating, and keep task-registration checks separate.
