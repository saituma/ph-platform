DELETE FROM "chat_group_members" a
USING "chat_group_members" b
WHERE a."groupId" = b."groupId"
  AND a."userId" = b."userId"
  AND a."id" > b."id";

ALTER TABLE "chat_group_members"
  ADD CONSTRAINT "chat_group_members_group_user_unique"
  UNIQUE ("groupId", "userId");

CREATE INDEX IF NOT EXISTS "chat_group_members_group_idx" ON "chat_group_members" ("groupId");
CREATE INDEX IF NOT EXISTS "chat_group_members_user_idx" ON "chat_group_members" ("userId");
CREATE INDEX IF NOT EXISTS "chat_group_messages_group_idx" ON "chat_group_messages" ("groupId");
CREATE INDEX IF NOT EXISTS "messages_sender_id_idx" ON "messages" ("senderId");
CREATE INDEX IF NOT EXISTS "messages_receiver_id_idx" ON "messages" ("receiverId");
CREATE INDEX IF NOT EXISTS "message_reactions_message_idx" ON "message_reactions" ("messageId");
CREATE INDEX IF NOT EXISTS "chat_group_message_reactions_message_idx" ON "chat_group_message_reactions" ("messageId");
