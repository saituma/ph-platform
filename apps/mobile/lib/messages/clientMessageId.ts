import * as Crypto from "expo-crypto";

/**
 * The idempotency key for a send.
 *
 * The server has a unique index on (conversationId, senderId, clientMessageId) and does an
 * ON CONFLICT DO NOTHING, so retrying a send with the same id can never create a duplicate
 * message. That guarantee is only as good as the id.
 *
 * This used to be `client-${Date.now()}` — millisecond resolution. Two sends in the same
 * millisecond (tapping send twice, or an outbox draining a backlog) produced IDENTICAL ids, so
 * the client-side dedup filter (`m.clientId !== clientId`) removed the wrong optimistic bubble
 * and the server treated the second message as a replay of the first and silently dropped it.
 *
 * expo-crypto is already a dependency; this adds none.
 */
export function newClientMessageId(): string {
  return Crypto.randomUUID();
}
