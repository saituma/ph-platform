# Tabs Layout Bootstrap Blocking Blank Screen

## Severity
Medium

## Risk
Tabs layout also returns `null` while waiting for bootstrap ready.

## Evidence
- `apps/mobile/app/(tabs)/_layout.tsx:106-108`.

## Impact
Any bootstrap deadlock or long API stall can appear as app freeze.

## Recommendation
Show guarded loading shell and track bootstrap timeout telemetry.
