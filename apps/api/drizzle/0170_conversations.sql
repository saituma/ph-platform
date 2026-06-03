CREATE TABLE IF NOT EXISTS "conversations" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "kind" varchar(20) NOT NULL DEFAULT 'direct',
  "directKey" varchar(40),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "conversations_direct_key_unique" ON "conversations" ("directKey");
CREATE INDEX IF NOT EXISTS "conversations_updated_at_idx" ON "conversations" ("updatedAt");

CREATE TABLE IF NOT EXISTS "conversation_participants" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "conversationId" integer NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "lastReadAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_participants_conversation_user_unique" ON "conversation_participants" ("conversationId", "userId");
CREATE INDEX IF NOT EXISTS "conversation_participants_conversation_idx" ON "conversation_participants" ("conversationId");
CREATE INDEX IF NOT EXISTS "conversation_participants_user_idx" ON "conversation_participants" ("userId");

CREATE TABLE IF NOT EXISTS "conversation_messages" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "conversationId" integer NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "senderId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content" varchar(500) NOT NULL,
  "contentType" "message_type" NOT NULL DEFAULT 'text',
  "mediaUrl" varchar(500),
  "clientMessageId" varchar(96),
  "pinnedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "conversation_messages_conversation_idx" ON "conversation_messages" ("conversationId");
CREATE INDEX IF NOT EXISTS "conversation_messages_conversation_created_at_idx" ON "conversation_messages" ("conversationId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_messages_conversation_sender_client_unique" ON "conversation_messages" ("conversationId", "senderId", "clientMessageId");

CREATE TABLE IF NOT EXISTS "conversation_receipts" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "messageId" integer NOT NULL REFERENCES "conversation_messages"("id") ON DELETE CASCADE,
  "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "deliveredAt" timestamp NOT NULL DEFAULT now(),
  "readAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_receipts_message_user_unique" ON "conversation_receipts" ("messageId", "userId");
CREATE INDEX IF NOT EXISTS "conversation_receipts_message_read_idx" ON "conversation_receipts" ("messageId", "readAt");
CREATE INDEX IF NOT EXISTS "conversation_receipts_user_read_idx" ON "conversation_receipts" ("userId", "readAt");

CREATE TABLE IF NOT EXISTS "conversation_message_reactions" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "messageId" integer NOT NULL REFERENCES "conversation_messages"("id") ON DELETE CASCADE,
  "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "emoji" varchar(16) NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "conversation_message_reactions_message_idx" ON "conversation_message_reactions" ("messageId");
