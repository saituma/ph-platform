# Socket Local Notification Flood Risk

## Severity
Medium

## Risk
Socket event handlers schedule local notifications directly without dedupe/rate limiting.

## Evidence
- `apps/mobile/context/SocketContext.tsx:134-145` schedules referral notifications.
- `apps/mobile/context/SocketContext.tsx:165-170` schedules program update notifications.

## Impact
Bursty backend events can trigger notification spam and poor user experience.

## Recommendation
Add per-event deduplication keys and short time-window throttling.
