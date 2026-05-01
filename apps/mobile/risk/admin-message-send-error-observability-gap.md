# Admin Message Send Error Observability Gap

## Severity
Medium

## Risk
Send failures are logged to console but not surfaced to user with actionable feedback.

## Evidence
- Group send catch logs only:
  - `apps/mobile/components/admin/messages/AdminGroupSection.tsx` (`console.error(e)`)
- DM send catch logs only:
  - `apps/mobile/components/admin/messages/AdminDmSection.tsx` (`console.error(e)`)

## Impact
Operators may assume message sent when it failed; support/debug loops become slower.

## Recommendation
Show explicit inline/toast error state with retry action.
