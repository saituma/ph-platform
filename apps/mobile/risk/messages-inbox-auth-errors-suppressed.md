# Messages Inbox Auth Errors Suppressed

## Severity
Medium

## Risk
Inbox request suppresses 401/403 status logging.

## Evidence
- `apps/mobile/services/messages/chatService.ts:12` passes `suppressStatusCodes: [401, 403]`.

## Impact
Authentication/authorization failures can be harder to diagnose in production and QA.

## Recommendation
Keep user-facing behavior quiet if needed, but emit structured telemetry for suppressed auth failures.
