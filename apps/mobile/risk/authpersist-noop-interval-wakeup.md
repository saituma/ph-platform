# AuthPersist No-Op Interval Wakeups

## Severity
Low

## Risk
A periodic interval is created every 30 seconds but performs no work.

## Evidence
- `apps/mobile/store/AuthPersist.tsx:365-367` creates `setInterval` with an empty callback block.

## Impact
Unnecessary wakeups increase battery overhead and complexity without functional benefit.

## Recommendation
Remove the interval or implement actual scheduled sync work behind it.
