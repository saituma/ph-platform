# Messages Debug Logs In Production Paths

## Severity
Medium

## Risk
Message sending/loading paths contain verbose debug logs without dev guards.

## Evidence
- Multiple logs in message controller/actions, e.g.:
  - `apps/mobile/hooks/useMessagesController.ts:257`
  - `apps/mobile/hooks/messages/useChatActions.ts:77`

## Impact
Potential metadata leakage in device logs and increased log noise/perf overhead in production.

## Recommendation
Gate debug logs behind `__DEV__` or remove them from production code paths.
