CREATE TABLE IF NOT EXISTS "chat_group_message_receipts" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "messageId" integer NOT NULL REFERENCES "chat_group_messages"("id"),
  "userId" integer NOT NULL REFERENCES "users"("id"),
  "deliveredAt" timestamp NOT NULL DEFAULT now(),
  "readAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "chat_group_message_receipts_message_user_unique"
ON "chat_group_message_receipts" ("messageId", "userId");

CREATE INDEX IF NOT EXISTS "chat_group_message_receipts_message_read_idx"
ON "chat_group_message_receipts" ("messageId", "readAt");

CREATE INDEX IF NOT EXISTS "chat_group_message_receipts_user_read_idx"
ON "chat_group_message_receipts" ("userId", "readAt");

INSERT INTO "chat_group_message_receipts" ("messageId", "userId", "deliveredAt", "readAt")
SELECT
  m.id AS "messageId",
  gm."userId" AS "userId",
  COALESCE(m."createdAt", now()) AS "deliveredAt",
  CASE
    WHEN gm."userId" = m."senderId" THEN COALESCE(m."createdAt", now())
    ELSE NULL
  END AS "readAt"
FROM "chat_group_messages" m
INNER JOIN "chat_group_members" gm
  ON gm."groupId" = m."groupId"
ON CONFLICT ("messageId", "userId") DO NOTHING;
