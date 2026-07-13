/**
 * Coalesces push notifications per (userId, threadId) so a burst of messages in the same thread
 * produces one push rather than one per message.
 *
 * The 3-second window lives in Postgres, not in this process. Previously the intent was held in
 * an in-memory setTimeout and only written to the durable outbox once the window closed — so a
 * dyno restart, a deploy, or a crash inside those 3 seconds silently dropped the notification,
 * and the write failure was swallowed (`.catch(() => {})`). The intent is now persisted on the
 * first message and simply scheduled to fire 3 seconds later; subsequent messages update that
 * same row. Nothing is lost if the process dies.
 */

import { createCoalescingPushIntent } from "../services/outbox.service";
import { isUserInThread } from "./presence";
import { isThreadMuted } from "../services/conversation-mute.service";

const BATCH_WINDOW_MS = 3_000;

/**
 * The key the outbox coalesces on. Scoped to (user, thread) so two different conversations never
 * collapse into one push.
 */
function dedupeKey(userId: number, threadId: string): string {
  return `push:msg:${userId}:${threadId}`;
}

export async function batchedPush(
  userId: number,
  threadId: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  // Cheap early-out. The outbox worker re-checks presence at delivery time, which is what
  // actually matters: the recipient may open the thread during the 3-second window.
  if (isUserInThread(userId, threadId)) return;
  if (await isThreadMuted(userId, threadId)) return;

  await createCoalescingPushIntent(
    {
      userId,
      title,
      body,
      data: { ...data, threadId, messageCount: 1 },
    },
    { dedupeKey: dedupeKey(userId, threadId), delayMs: BATCH_WINDOW_MS },
  );
}

/**
 * Composes the delivered title from the coalesced count. Applied by the outbox worker at send
 * time rather than at enqueue time, because the count is not final until the window closes.
 *
 *   "New message from John"  + 3  ->  "3 messages from John"
 */
export function formatBatchedTitle(base: string, count: number): string {
  if (count <= 1) return base;
  return base
    .replace(/^New message from /, `${count} messages from `)
    .replace(/^(.+) in (.+)$/, `${count} new messages in $2`);
}
