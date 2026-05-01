# Push Reply Has No Failure Feedback

## Severity
Medium

## Risk
Push quick-reply/mark-read actions run async without error feedback to user.

## Evidence
- `apps/mobile/hooks/navigation/usePushNotificationResponses.ts:153-162` uses fire-and-forget `void` actions.
- Reply API calls suppress 401/403 status logs (`:103-104`, `:114-115`).

## Impact
Users may believe actions succeeded when backend rejected them (expired auth, connectivity issues).

## Recommendation
Add local acknowledgement/error fallback (e.g., "Couldn’t send reply") and bounded retry queue.
