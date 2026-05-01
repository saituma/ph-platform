# Live Location RoutePoints Privacy Surface

## Severity
Medium

## Risk
Background task periodically sends not only current location but also recent route polyline points.

## Evidence
- Route points are included in live location payload:
  - `apps/mobile/lib/backgroundTask.ts:115-123`
- API contract accepts route points:
  - `apps/mobile/services/tracking/locationService.ts:18`

## Impact
Increases precision/volume of location exposure for shared tracking features and raises privacy sensitivity.

## Recommendation
Minimize payload by default (current point only), and gate route trail sharing behind explicit, granular consent.
