# Admin Team Chat Created With Empty Members

## Severity
Medium

## Risk
Auto-created team chat can be created with no initial members.

## Evidence
- `apps/mobile/components/admin/messages/AdminGroupSection.tsx` `openTeamChat` calls `createGroup` with `memberIds: []`.

## Impact
Team chat may exist but not include expected participants, causing silent delivery failures/confusion.

## Recommendation
Seed group membership from team roster when auto-creating team chats.
