# Messages Warmup Extra Network Overhead

## Severity
Low

## Risk
Tab layout performs eager inbox + messages warmup plus up to 4 group fetches on bootstrap.

## Evidence
- Warmup in `apps/mobile/app/(tabs)/_layout.tsx:54-86`.

## Impact
Can increase startup network traffic and battery usage on constrained networks.

## Recommendation
Gate warmup by network quality/app state or apply adaptive caps/backoff.
