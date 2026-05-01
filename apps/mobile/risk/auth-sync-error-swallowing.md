# Auth Sync Error Swallowing

## Severity
Medium

## Risk
Core profile sync path swallows all errors without reporting telemetry or user-facing fallback.

## Evidence
- `apps/mobile/store/AuthPersist.tsx:337-338` catches and ignores sync errors in `syncProfile`.

## Impact
Role/team/capability drift can persist silently, leading to stale permissions/UI state with low diagnosability.

## Recommendation
Record structured telemetry for sync failures and trigger a bounded retry/backoff strategy with stale-state indicator.
