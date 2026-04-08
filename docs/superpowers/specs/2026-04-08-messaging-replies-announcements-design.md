# Messaging: Swipe-to-Reply + Announcements (Mobile)

## Goal
1) Add **swipe-right to reply** on any message bubble (incoming or outgoing) inside a message thread on mobile, similar to Telegram/WhatsApp.
2) Add **read-only Announcements** inside the **Messages** tab and **More** tab, sourced from the existing admin announcements CMS (not chat groups).

Non-goals:
- No editing announcements from mobile.
- No “announcement chat” / replying to announcements.
- No new backend schema work (use existing API shapes).

## Current State (Observed)
- Mobile messaging uses `useMessagesController` and renders threads via:
  - Inbox: `apps/mobile/app/(tabs)/messages/index.tsx` → `InboxScreen`
  - Thread: `apps/mobile/app/messages/[id].tsx` → `ThreadChatBody`
- The API already supports replies for both direct messages and group chat:
  - Client sends `replyToMessageId` + `replyPreview`
  - Server stores as a content prefix: `[reply:<id>:<preview>] ` prepended to `content`
- Mobile currently treats message `text` as raw content (`msg.content`) without parsing reply prefix.
- Mobile already classifies some groups as `channelType: "announcement"` based on group name, but that is **separate** from the admin “Send Announcement” CMS.

## UX / Interaction Design

### A) Swipe-to-Reply (Thread Screen)
**Where**
- Inside a thread (`/messages/[id]`) for both direct and group threads.
- Gesture applied to each message bubble.

**Gesture**
- Swipe right on a message bubble reveals a reply icon.
- Releasing beyond a threshold triggers “set reply target”.
- Works for both your messages and coach messages.

**Reply composer UI**
- When a reply target is set, show a compact “Replying to …” bar above the composer:
  - Left: author label (if available) + snippet
  - Right: X (clear)
- If user switches thread, reply target clears.

**Sending behavior**
- When reply target is set, outgoing send includes:
  - `replyToMessageId` (numeric server message id)
  - `replyPreview` (string, <= 160)
- After send succeeds, reply target clears.
- Optimistic outgoing message should already display the reply snippet.

**Rendering replied messages**
- If a message has a reply prefix, render a quoted preview block at top of the bubble:
  - Shows `replyPreview` if present, otherwise a fallback like “Replied message”
- Tapping the quote scrolls to the replied-to message in the list and briefly highlights it (when present in current thread’s loaded messages).

**Edge cases**
- If replied-to message isn’t loaded (older history), tapping quote does nothing (or shows a subtle toast).
- If message id is not numeric (optimistic client id), it cannot be targeted by replies; swiping it still sets a reply target only if it’s a numeric id (otherwise ignore).

### B) Announcements (Read-only)
**Source**
- Use `GET /content/announcements` (already exists in API).

**Messages tab**
- Add an “Announcements” card/section at the top of the Messages tab:
  - Shows latest announcement title and timestamp/snippet + count (if available).
  - Tap opens an Announcements feed screen (read-only).

**More tab**
- Add an “Announcements” row that opens the same feed screen.

**Announcements feed screen**
- Simple list of announcements (most recent first).
- Each card supports:
  - Title
  - Body rendered as markdown-ish (reuse existing `AnnouncementsSection` parsing for images/videos/markdown where possible)
- No composer; no reactions; no replies.

## Data Model & Parsing

### Reply prefix format
Server format:
`[reply:<messageId>:<encodedPreview>] <original content>`

Mobile parsing:
- Extract `replyToMessageId?: number`
- Extract `replyPreview?: string`
- Strip prefix from displayed message text

Decoding:
- `replyPreview` is URL-encoded by the server; decode with `decodeURIComponent` (fallback to raw on error).

### Mobile message shape updates
Extend `ChatMessage` with optional reply metadata (derived at load time):
- `replyToMessageId?: number`
- `replyPreview?: string`

This is a UI-only extension; no persistence required.

## API Integration

### Direct messages
When sending:
- `POST /messages` with body containing:
  - `content`
  - `contentType`
  - `mediaUrl?`
  - `clientId?`
  - `replyToMessageId?`
  - `replyPreview?`

### Group messages
When sending:
- `POST /chat/groups/:groupId/messages` with body containing:
  - `content`
  - `contentType?`
  - `mediaUrl?`
  - `replyToMessageId?`
  - `replyPreview?`

## Implementation Plan (High-level)

### 1) Reply state in controller
In `useMessagesController`:
- Add state:
  - `replyTarget: { messageId: number; preview: string; authorName?: string } | null`
- Add helpers:
  - `setReplyTargetFromMessage(message: ChatMessage)`
  - `clearReplyTarget()`
- Ensure `handleSend` / `sendMessagePayload` passes reply fields and clears reply target on success.
- Ensure thread switches clear reply target.

### 2) Parse reply prefix when mapping messages
When mapping API messages to `ChatMessage` in:
- `loadMessages` (direct thread list)
- `loadGroupMessages` (group thread messages)

Extract reply metadata and set:
- `text` stripped of prefix
- `replyToMessageId` and `replyPreview`

### 3) Swipe gesture on `MessageBubble`
Implement swipe-to-reply in `MessageBubble`:
- Wrap bubble in a right-swipe component (gesture handler `Swipeable`).
- Trigger `onReply(message)` when swiped past threshold.

Plumbing changes:
- Thread chat list passes an `onReplyMessage(message)` handler down to each bubble.
- Thread screen shows reply bar above composer (inside `ThreadChatBody`).

### 4) Render quote block
If `message.replyToMessageId` exists:
- Render a small quote block at top of the bubble with preview.
- On tap, call `onJumpToMessage(message.replyToMessageId)` provided by `ThreadChatBody`.
- Implement jump-to-message by scrolling the FlatList and temporarily highlighting the target row.

### 5) Announcements UI + screen
- Add a mobile API call for announcements (new hook or inside messages screen):
  - `apiRequest("/content/announcements")`
- Create screen (route) for announcements feed (read-only).
- Add:
  - Messages tab top card linking to the feed.
  - More tab row linking to the feed.

## Files Likely Touched
- `apps/mobile/hooks/useMessagesController.ts` (reply state + send payload + parse)
- `apps/mobile/components/messages/ThreadChatBody.tsx` (reply bar UI + jump-to-message)
- `apps/mobile/components/messages/MessageBubble.tsx` (swipe gesture + quote block)
- `apps/mobile/app/messages/[id].tsx` (wire handlers)
- `apps/mobile/app/(tabs)/messages/index.tsx` (announcements card)
- `apps/mobile/app/(tabs)/more.tsx` (announcements row)
- `apps/mobile/app/announcements.tsx` (new read-only feed screen) OR `apps/mobile/app/(tabs)/messages/announcements.tsx` (if nested preferred)

## Testing (Manual)
- Swipe right on coach message → reply bar appears → send → receiver gets reply + UI shows quote block.
- Swipe right on your own message → reply bar appears → send → quote block renders.
- Tap quote block → scroll/highlight target message.
- Open Messages tab → announcements card shows when announcements exist.
- Open Announcements feed → content renders (text + images/videos if present).

