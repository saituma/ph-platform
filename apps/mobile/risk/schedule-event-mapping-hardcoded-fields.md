# Schedule Event Mapping Uses Hardcoded Fields

## Severity
Low

## Risk
Calendar event mapping injects hardcoded `tag` and `coach` values.

## Evidence
- `apps/mobile/components/tracking/schedule/utils.ts` sets:
  - `tag: "Parent"`
  - `coach: "Coach"`

## Impact
Displayed metadata can be inaccurate and reduce trust in schedule details.

## Recommendation
Map these values from API payload where available, with explicit fallback labels.
