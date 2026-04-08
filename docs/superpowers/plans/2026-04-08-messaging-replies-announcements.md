# Messaging Replies + Announcements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add swipe-right to reply in mobile message threads and add a read-only announcements feed entrypoint in Messages + More tabs.

**Architecture:** Parse the API’s existing reply prefix (`[reply:id:preview]`) into first-class `ChatMessage` fields, track a per-thread `replyTarget` in `useMessagesController`, and use `react-native-gesture-handler` swipe gestures on message bubbles to set it. Announcements are fetched via `GET /content/announcements` and displayed in a dedicated read-only feed screen.

**Tech Stack:** Expo Router, React Native, `react-native-gesture-handler`, Jest (jest-expo), existing `apiRequest` helper.

---

## File map (responsibilities)

**Reply parsing + state**
- Create: `apps/mobile/lib/messages/reply.ts` (parse/encode reply prefix)
- Test: `apps/mobile/test/messages/reply.test.ts` (unit tests for parser)
- Modify: `apps/mobile/constants/messages.ts` (extend `ChatMessage` type with reply fields)
- Modify: `apps/mobile/hooks/useMessagesController.ts` (store `replyTarget`, parse incoming, include reply fields in outgoing requests)

**Swipe + UI**
- Modify: `apps/mobile/components/messages/MessageBubble.tsx` (swipe-right gesture + render quote block)
- Modify: `apps/mobile/components/messages/ThreadChatBody.tsx` (reply bar above composer + scroll-to-message/highlight)
- Modify: `apps/mobile/app/messages/[id].tsx` (wire `onReplyMessage` and `onJumpToMessage`)

**Announcements**
- Create: `apps/mobile/app/announcements.tsx` (read-only feed screen)
- Modify: `apps/mobile/app/(tabs)/messages/index.tsx` (top announcements card; navigate to `/announcements`)
- Modify: `apps/mobile/app/(tabs)/more.tsx` (add “Announcements” row; navigate to `/announcements`)

---

### Task 1: Add reply prefix parser + tests

**Files:**
- Create: `apps/mobile/lib/messages/reply.ts`
- Test: `apps/mobile/test/messages/reply.test.ts`

- [ ] **Step 1: Create `parseReplyPrefix` + `stripReplyPrefix`**

Add `apps/mobile/lib/messages/reply.ts`:

```ts
export type ParsedReplyPrefix = {
  replyToMessageId: number | null;
  replyPreview: string;
  text: string;
};

const REPLY_RE = /^\[reply:(\d+):([^\]]*)\]\s*/;

export function parseReplyPrefix(raw: string): ParsedReplyPrefix {
  const input = String(raw ?? "");
  const match = input.match(REPLY_RE);
  if (!match) return { replyToMessageId: null, replyPreview: "", text: input };

  const replyToMessageId = Number(match[1]);
  const encodedPreview = match[2] ?? "";
  let replyPreview = "";
  try {
    replyPreview = decodeURIComponent(encodedPreview);
  } catch {
    replyPreview = encodedPreview;
  }
  const text = input.slice(match[0].length);
  return {
    replyToMessageId: Number.isFinite(replyToMessageId) ? replyToMessageId : null,
    replyPreview,
    text,
  };
}
```

- [ ] **Step 2: Add unit tests**

Add `apps/mobile/test/messages/reply.test.ts`:

```ts
import { parseReplyPrefix } from "@/lib/messages/reply";

describe("parseReplyPrefix", () => {
  it("returns original text when no prefix", () => {
    expect(parseReplyPrefix("hello")).toEqual({
      replyToMessageId: null,
      replyPreview: "",
      text: "hello",
    });
  });

  it("parses reply prefix and strips it", () => {
    const msg = "[reply:123:hello%20there] hi";
    expect(parseReplyPrefix(msg)).toEqual({
      replyToMessageId: 123,
      replyPreview: "hello there",
      text: "hi",
    });
  });

  it("handles decode failures", () => {
    const msg = "[reply:7:%E0%A4%A] hey";
    expect(parseReplyPrefix(msg)).toMatchObject({
      replyToMessageId: 7,
      text: "hey",
    });
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter mobile test -- apps/mobile/test/messages/reply.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/lib/messages/reply.ts apps/mobile/test/messages/reply.test.ts
git commit -m "feat(mobile): parse reply prefix for messages"
```

---

### Task 2: Extend `ChatMessage` with reply metadata

**Files:**
- Modify: `apps/mobile/constants/messages.ts`

- [ ] **Step 1: Add optional fields**

Update `ChatMessage` in `apps/mobile/constants/messages.ts`:

```ts
export type ChatMessage = {
  // ...
  replyToMessageId?: number;
  replyPreview?: string;
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter mobile typecheck`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/constants/messages.ts
git commit -m "chore(mobile): add reply fields to ChatMessage"
```

---

### Task 3: Parse incoming replies and add replyTarget state in `useMessagesController`

**Files:**
- Modify: `apps/mobile/hooks/useMessagesController.ts`
- Modify: `apps/mobile/hooks/useMessagesController.ts` (send payloads)

- [ ] **Step 1: Parse direct messages when mapping**

In the `mappedMessages` mapping inside `loadMessages`, apply:

```ts
import { parseReplyPrefix } from "@/lib/messages/reply";
```

Then:

```ts
const parsed = parseReplyPrefix(msg.content);
return {
  // ...
  text: parsed.text,
  replyToMessageId: parsed.replyToMessageId ?? undefined,
  replyPreview: parsed.replyPreview || undefined,
};
```

- [ ] **Step 2: Parse group messages when mapping**

In `loadGroupMessages`, parse `msg.content` the same way, setting `text`, `replyToMessageId`, `replyPreview`.

- [ ] **Step 3: Add `replyTarget` state**

Add near other controller state:

```ts
const [replyTarget, setReplyTarget] = useState<{
  messageId: number;
  preview: string;
  authorName?: string;
} | null>(null);
```

Expose via hook return.

- [ ] **Step 4: Add `setReplyTargetFromMessage` helper**

```ts
const setReplyTargetFromMessage = useCallback((message: ChatMessage) => {
  const id = Number(message.id);
  if (!Number.isFinite(id)) return;
  const preview = (message.text || (message.mediaUrl ? "Media message" : "Message")).slice(0, 160);
  setReplyTarget({ messageId: id, preview, authorName: message.authorName ?? undefined });
}, []);
```

- [ ] **Step 5: Clear reply target on thread change**

When `currentThread?.id` changes, set `replyTarget` to null.

- [ ] **Step 6: Include reply fields in outgoing API calls**

Update:
- direct `apiRequest("/messages", { body: ... })`
- group `apiRequest("/chat/groups/.../messages", { body: ... })`

to include:

```ts
replyToMessageId: replyTarget?.messageId,
replyPreview: replyTarget?.preview,
```

Clear `replyTarget` after a successful send.

- [ ] **Step 7: Run typecheck + tests**

Run: `pnpm --filter mobile typecheck`
Run: `pnpm --filter mobile test -- apps/mobile/test/messages/reply.test.ts`

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/hooks/useMessagesController.ts
git commit -m "feat(mobile): add replyTarget and send reply metadata"
```

---

### Task 4: Add swipe-to-reply in `MessageBubble`

**Files:**
- Modify: `apps/mobile/components/messages/MessageBubble.tsx`

- [ ] **Step 1: Add `onReply` prop**

Extend props:

```ts
onReply: (message: ChatMessage) => void;
onJumpToMessage?: (messageId: number) => void;
```

- [ ] **Step 2: Render quote block when message is a reply**

At top of bubble content:

```tsx
{message.replyToMessageId ? (
  <Pressable
    onPress={() => onJumpToMessage?.(message.replyToMessageId!)}
    style={{ marginBottom: 8, borderLeftWidth: 3, paddingLeft: 10, opacity: 0.9 }}
  >
    <Text numberOfLines={2} style={{ fontSize: 12, opacity: 0.85 }}>
      {message.replyPreview || "Replied message"}
    </Text>
  </Pressable>
) : null}
```

- [ ] **Step 3: Wrap bubble in a right-swipe gesture**

Use gesture-handler `Swipeable`:

```tsx
import { Swipeable } from "react-native-gesture-handler";
```

Wrap the message pressable:
- Right swipe triggers `onReply(message)` past threshold.
- Keep long-press behavior intact.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter mobile typecheck`

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/messages/MessageBubble.tsx
git commit -m "feat(mobile): swipe right to reply on message bubbles"
```

---

### Task 5: Add reply bar + jump-to-message in `ThreadChatBody`

**Files:**
- Modify: `apps/mobile/components/messages/ThreadChatBody.tsx`
- Modify: `apps/mobile/app/messages/[id].tsx`

- [ ] **Step 1: ThreadChatBody props**

Add:

```ts
replyTarget: { messageId: number; preview: string; authorName?: string } | null;
onClearReplyTarget: () => void;
onReplyMessage: (message: ChatMessage) => void;
```

- [ ] **Step 2: Render reply bar above composer**

If `replyTarget`:
- show bar with preview + X button calling `onClearReplyTarget`

- [ ] **Step 3: Implement jump-to-message**

Inside `ThreadChatBody`, create a map of `messageId -> index` for the FlatList’s data and scroll to it on quote press. Briefly highlight the row (state `highlightedMessageId` with a timeout).

- [ ] **Step 4: Wire from `apps/mobile/app/messages/[id].tsx`**

Pass:
- `replyTarget` and setters from `useMessagesController`
- `onReplyMessage={setReplyTargetFromMessage}`

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter mobile typecheck`

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/components/messages/ThreadChatBody.tsx apps/mobile/app/messages/[id].tsx
git commit -m "feat(mobile): show reply bar and jump to replied message"
```

---

### Task 6: Add read-only Announcements entrypoints + feed screen

**Files:**
- Create: `apps/mobile/app/announcements.tsx`
- Modify: `apps/mobile/app/(tabs)/messages/index.tsx`
- Modify: `apps/mobile/app/(tabs)/more.tsx`

- [ ] **Step 1: Create announcements screen**

Create `apps/mobile/app/announcements.tsx` that:
- reads `token` from store
- fetches `apiRequest("/content/announcements")`
- renders a list (title + body snippet + created/updated time)
- uses existing markdown/media parsing logic from `components/home/AnnouncementsSection.tsx` where useful (copy helper or factor into a shared helper if small)

- [ ] **Step 2: Add top announcements card in Messages tab**

In `apps/mobile/app/(tabs)/messages/index.tsx`:
- fetch announcements count + latest item (lightweight)
- show a card above `InboxScreen`
- onPress: `router.push("/announcements")`

- [ ] **Step 3: Add More tab row**

In `apps/mobile/app/(tabs)/more.tsx`:
- add a row “Announcements”
- onPress: `router.push("/announcements")`

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter mobile typecheck`

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/announcements.tsx apps/mobile/app/(tabs)/messages/index.tsx apps/mobile/app/(tabs)/more.tsx
git commit -m "feat(mobile): add read-only announcements feed entrypoints"
```

---

### Task 7: Final verification

**Files:**
- (no code changes unless fixes needed)

- [ ] **Step 1: Run mobile typecheck**

Run: `pnpm --filter mobile typecheck`

- [ ] **Step 2: Run mobile unit tests**

Run: `pnpm --filter mobile test`

- [ ] **Step 3: Manual QA checklist**
- Swipe right on coach message → reply bar appears → send → quote block displays.
- Swipe right on your message → reply bar appears → send → quote block displays.
- Tap quote block → scroll + highlight target.
- Messages tab shows announcements card; tapping opens feed.
- More tab row opens same feed.

