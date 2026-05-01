# Admin Group Thread Duplicate Message Risk

## Severity
Medium

## Risk
Group messages can be appended from both socket events and explicit send/load paths without dedupe by stable ID.

## Evidence
- Socket handler appends directly:
  - `apps/mobile/components/admin/messages/AdminGroupSection.tsx` (`handleNewMessage`)
- Send path also appends returned message:
  - same file, `handleSend`.

## Impact
Duplicate message bubbles can appear during race conditions (send ACK + socket broadcast + manual reload).

## Recommendation
Normalize by message ID/clientId before appending in all paths.
