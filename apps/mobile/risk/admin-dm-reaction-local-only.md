# Admin DM Reactions Are Local-Only State

## Severity
Medium

## Risk
DM reaction updates are maintained in local component state without backend persistence in this flow.

## Evidence
- Reactions stored in local map state:
  - `apps/mobile/components/admin/messages/AdminDmSection.tsx` (`reactionsByMessageId`)
- `handleToggleReaction` mutates local state only in this component.

## Impact
Reactions can diverge across devices/sessions and disappear on reload.

## Recommendation
Persist reactions via API/socket events and treat local state as optimistic UI only.
