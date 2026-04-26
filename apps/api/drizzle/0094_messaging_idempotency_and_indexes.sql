ALTER TABLE "messages"
ADD COLUMN IF NOT EXISTS "clientMessageId" varchar(96);

ALTER TABLE "chat_group_messages"
ADD COLUMN IF NOT EXISTS "clientMessageId" varchar(96);

CREATE UNIQUE INDEX IF NOT EXISTS "messages_sender_receiver_client_unique"
ON "messages" ("senderId", "receiverId", "clientMessageId");

CREATE UNIQUE INDEX IF NOT EXISTS "chat_group_messages_group_sender_client_unique"
ON "chat_group_messages" ("groupId", "senderId", "clientMessageId");

CREATE INDEX IF NOT EXISTS "messages_receiver_created_at_idx"
ON "messages" ("receiverId", "createdAt");

CREATE INDEX IF NOT EXISTS "chat_group_messages_group_created_at_idx"
ON "chat_group_messages" ("groupId", "createdAt");
