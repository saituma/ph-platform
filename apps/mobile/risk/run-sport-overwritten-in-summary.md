# Run Sport Overwritten In Summary

## Severity
High

## Risk
Active run persistence stores selected sport, then summary persistence overwrites same run with `sport: null` via `INSERT OR REPLACE`.

## Evidence
- Active run save writes sport:
  - `apps/mobile/app/(tabs)/tracking/active-run.tsx:277`
- Summary screen persists again with `sport: null`:
  - `apps/mobile/app/(tabs)/tracking/summary.tsx:147`
- Persistence method replaces full row:
  - `apps/mobile/lib/sqliteRuns.ts:81` (`INSERT OR REPLACE`)

## Impact
Sport classification can be lost, affecting categorized activity views and analytics.

## Recommendation
Do not re-persist immutable run fields on summary, or preserve existing `sport` when updating feedback.
