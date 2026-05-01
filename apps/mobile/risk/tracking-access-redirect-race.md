# Tracking Access Redirect Race

## Severity
Medium

## Risk
Tracking screens redirect immediately when capability checks are false, even during initial hydration windows.

## Evidence
- `apps/mobile/app/(tabs)/tracking/index.tsx:192-197`
- `apps/mobile/app/(tabs)/tracking/social.tsx:156-169`

## Impact
Users can see redirect flicker or be bounced away transiently before role/capabilities settle.

## Recommendation
Introduce an auth/capabilities-ready state before enforcing redirect.
