# Auth Layout Bootstrap Blocking Blank Screen

## Severity
Medium

## Risk
Auth layout returns `null` while authenticated + bootstrap not ready, producing prolonged blank screen if bootstrap hangs.

## Evidence
- `apps/mobile/app/(auth)/_layout.tsx:31-33`.

## Impact
Users can get stuck on blank UI during bootstrap regressions.

## Recommendation
Render explicit loading/fallback UI with timeout + recovery action.
