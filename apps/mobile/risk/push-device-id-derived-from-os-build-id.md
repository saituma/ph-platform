# Push Device ID Derived From OS Build ID

## Severity
Low

## Risk
Push registration derives device identifier from `osBuildId`, which may not be ideal as a stable per-device app identifier.

## Evidence
- `apps/mobile/lib/pushRegistration.ts:202-205` reads `expo-device` `osBuildId` and uses it as `deviceId`.

## Impact
Identifier stability/uniqueness characteristics may vary by platform/OS update behavior, risking token association drift.

## Recommendation
Use an app-scoped stable installation ID persisted locally (with reset semantics) instead of OS build metadata.
