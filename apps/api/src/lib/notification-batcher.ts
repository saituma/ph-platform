/**
 * Debounces push notifications per (userId, threadId) so a burst of messages
 * in the same thread produces one push rather than one per message.
 *
 * Window: 3 seconds. After the window expires with no new messages the latest
 * queued push fires. The title is updated to reflect the count ("3 messages
 * from John") so users know they missed more than one.
 *
 * In-process only — in multi-instance deployments each process batches
 * independently, which still reduces volume significantly vs. per-message sends.
 */

import { createPushIntent } from "../services/outbox.service";
import { isUserInThread } from "./presence";
import { isThreadMuted } from "../services/conversation-mute.service";

const BATCH_WINDOW_MS = 3_000;

type Batch = {
  count: number;
  latestTitle: string;
  body: string;
  data: Record<string, unknown>;
  timer: ReturnType<typeof setTimeout>;
};

const pending = new Map<string, Batch>();

function batchKey(userId: number, threadId: string): string {
  return `${userId}:${threadId}`;
}

function formatTitle(base: string, count: number): string {
  if (count <= 1) return base;
  // "New message from John" → "3 messages from John"
  return base.replace(/^New message from /, `${count} messages from `).replace(/^(.+) in (.+)$/, `${count} new messages in $2`);
}

export async function batchedPush(
  userId: number,
  threadId: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  // Skip push if user is in the thread right now or has muted it.
  if (isUserInThread(userId, threadId)) return;
  if (await isThreadMuted(userId, threadId)) return;

  const key = batchKey(userId, threadId);
  const existing = pending.get(key);

  if (existing) {
    clearTimeout(existing.timer);
    existing.count += 1;
    existing.latestTitle = title;
    existing.body = body;
    existing.data = data;
    existing.timer = setTimeout(() => flush(userId, key), BATCH_WINDOW_MS);
    return;
  }

  const batch: Batch = {
    count: 1,
    latestTitle: title,
    body,
    data,
    timer: setTimeout(() => flush(userId, key), BATCH_WINDOW_MS),
  };
  pending.set(key, batch);
}

async function flush(userId: number, key: string): Promise<void> {
  const batch = pending.get(key);
  if (!batch) return;
  pending.delete(key);

  const finalTitle = formatTitle(batch.latestTitle, batch.count);
  const finalBody = batch.count > 1 ? `${batch.count} new messages` : batch.body;

  await createPushIntent({
    userId,
    title: finalTitle,
    body: finalBody,
    data: { ...batch.data, messageCount: batch.count },
  }).catch(() => {});
}
