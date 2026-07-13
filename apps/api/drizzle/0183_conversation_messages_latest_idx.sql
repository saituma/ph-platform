-- Supports the inbox's "last message per conversation" lookup, which is now a
-- DISTINCT ON (conversationId) ... ORDER BY conversationId, id DESC.
--
-- The existing (conversationId, createdAt) index does not serve that ordering; without a
-- matching index Postgres has to sort every candidate row. With it, DISTINCT ON becomes an
-- index scan that reads one row per conversation.
--
-- Previously this query had no LIMIT at all and the "first row per group" was picked in
-- JavaScript, so opening the inbox loaded every message the user had ever exchanged — and for
-- a platform admin, effectively the whole table.
CREATE INDEX IF NOT EXISTS "conversation_messages_conversation_id_desc_idx"
  ON "conversation_messages" ("conversationId", "id" DESC);
