# Admin Prefetch Unbounded Threads

## Severity
Low

## Risk
Admin prefetch kicks off for all listed threads/groups without adaptive cap based on device/network conditions.

## Evidence
- Group prefetch call for full list:
  - `apps/mobile/components/admin/messages/AdminGroupSection.tsx`
- DM prefetch call for full list:
  - `apps/mobile/components/admin/messages/AdminDmSection.tsx`

## Impact
Can increase startup/network load and degrade responsiveness on large orgs.

## Recommendation
Cap prefetch count, prioritize visible threads, and defer remainder.
