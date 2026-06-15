ALTER TABLE "chat_group_messages"
  ALTER COLUMN "content" TYPE text;

CREATE UNIQUE INDEX IF NOT EXISTS "chat_group_messages_group_sender_client_unique"
  ON "chat_group_messages" ("groupId", "senderId", "clientMessageId");
