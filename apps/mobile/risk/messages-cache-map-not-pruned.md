# Messages Cache Map Not Pruned

## Severity
Low

## Risk
Expired cache entries are treated as invalid but never removed from the in-memory map.

## Evidence
- Cache store is process-global map:
  - `apps/mobile/hooks/messages/useChatCache.ts:18`
- TTL check returns null but does not delete stale entries:
  - `apps/mobile/hooks/messages/useChatCache.ts:26-27`

## Impact
Memory can grow across many profile switches/sessions within a long-lived app process.

## Recommendation
Delete stale entries during TTL checks and add periodic map cleanup.
