# Group Details All-Or-Nothing Fetch

## Severity
Medium

## Risk
Group details loading uses `Promise.all`, so failure of one endpoint fails the whole operation.

## Evidence
- `apps/mobile/services/messages/chatService.ts:17-29` fetches messages and members via `Promise.all`.

## Impact
Partial availability (e.g., members endpoint failing) can block rendering messages even when message data is available.

## Recommendation
Use `Promise.allSettled` and render available data with graceful degradation.
