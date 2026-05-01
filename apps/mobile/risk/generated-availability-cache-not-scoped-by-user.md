# Generated Availability Cache Not Scoped By User

## Severity
Medium

## Risk
Generated availability query key does not include user identity, only date range.

## Evidence
- `apps/mobile/components/tracking/schedule/hooks.ts` uses:
  - `queryKey: ["generated-availability", fromIso, toIso]`

## Impact
Cross-user stale availability can appear after user switches or role changes in the same session.

## Recommendation
Scope query key by effective user/profile/team context and invalidate on auth changes.
