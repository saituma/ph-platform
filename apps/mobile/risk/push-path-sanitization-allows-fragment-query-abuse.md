# Push Path Sanitization Allows Query/Fragment Abuse Surface

## Severity
Low

## Risk
Internal-path check blocks external URLs, but still allows arbitrary internal query/fragment payloads.

## Evidence
- `apps/mobile/hooks/navigation/usePushNotificationResponses.ts:118-125` validates only path shape.

## Impact
Malformed internal route strings can still trigger unexpected navigation states.

## Recommendation
Whitelist known push destinations/types and map payloads to typed routes instead of passing raw paths.
