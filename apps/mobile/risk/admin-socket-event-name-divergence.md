# Admin Socket Event Name Divergence Risk

## Severity
Low

## Risk
Admin messaging listens to different socket event names (`group_message`, `direct_message`) than user messaging paths (`group:message`, `message:new`).

## Evidence
- Admin listeners in:
  - `apps/mobile/components/admin/messages/AdminGroupSection.tsx`
  - `apps/mobile/components/admin/messages/AdminDmSection.tsx`
- User listeners in:
  - `apps/mobile/hooks/useMessagesRealtime.ts`

## Impact
Backend event contract drift can break one surface while the other keeps working, making regressions easy to miss.

## Recommendation
Centralize socket event constants/shared contract tests across admin and end-user messaging flows.
