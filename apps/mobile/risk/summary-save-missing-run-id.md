# Summary Save Without Guarded Run ID

## Severity
Medium

## Risk
Summary save path updates feedback using empty string when `currentRunId` is missing.

## Evidence
- `apps/mobile/app/(tabs)/tracking/summary.tsx:184` calls `updateRunFeedback(currentRunId ?? "", ...)`.

## Impact
Silent no-op update can occur while UI proceeds as if save succeeded.

## Recommendation
Guard save with explicit `currentRunId` presence and fail visibly if missing.
