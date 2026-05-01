# Schedule Query Cache Not Scoped By User

## Severity
High

## Risk
Schedule query keys are global and do not include user identity/token context.

## Evidence
- `apps/mobile/components/tracking/schedule/hooks.ts`:
  - `queryKey: ["bookings"]`
  - `queryKey: ["booking-services"]`

## Impact
After account switching in one app process, stale schedule/service data can be shown from another user context.

## Recommendation
Include user/profile ID in query keys (e.g., `['bookings', profileId]`) and clear related caches on logout.
