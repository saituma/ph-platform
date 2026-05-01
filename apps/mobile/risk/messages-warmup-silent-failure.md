# Messages Warmup Silent Failure

## Severity
Low

## Risk
Tab-level message warmup suppresses errors and swallows exceptions entirely.

## Evidence
- `apps/mobile/app/(tabs)/_layout.tsx:58-60` suppresses 401/403 logs.
- `apps/mobile/app/(tabs)/_layout.tsx:87-89` catches and ignores all warmup errors.

## Impact
Warmup regressions can go unnoticed, making message cold-start performance issues harder to diagnose.

## Recommendation
Record non-blocking telemetry for warmup failures while keeping UI flow unaffected.
