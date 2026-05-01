# Direct Message ReceiverId Is Optional

## Severity
Medium

## Risk
Direct message service accepts an optional `receiverId`, allowing invalid outbound payloads.

## Evidence
- `apps/mobile/services/messages/chatService.ts:40`:
  - `sendDirectMessage(token: string, text: string, receiverId?: number, ...)`
- Request body always includes `receiverId` field:
  - same file (`body: { content: text.trim(), receiverId }`).

## Impact
If caller passes/propagates `undefined`, message send can fail depending on backend validation path.

## Recommendation
Make `receiverId` required in service signature and add an explicit runtime guard before request dispatch.
