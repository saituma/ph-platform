CREATE TABLE IF NOT EXISTS "message_receipts" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "messageId" integer NOT NULL REFERENCES "messages"("id"),
  "userId" integer NOT NULL REFERENCES "users"("id"),
  "deliveredAt" timestamp NOT NULL DEFAULT now(),
  "readAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "message_receipts_message_user_unique"
ON "message_receipts" ("messageId", "userId");

CREATE INDEX IF NOT EXISTS "message_receipts_message_read_idx"
ON "message_receipts" ("messageId", "readAt");

CREATE INDEX IF NOT EXISTS "message_receipts_user_read_idx"
ON "message_receipts" ("userId", "readAt");

INSERT INTO "message_receipts" ("messageId", "userId", "deliveredAt", "readAt")
SELECT
  m.id AS "messageId",
  m."senderId" AS "userId",
  COALESCE(m."createdAt", now()) AS "deliveredAt",
  COALESCE(m."createdAt", now()) AS "readAt"
FROM "messages" m
ON CONFLICT ("messageId", "userId") DO NOTHING;

INSERT INTO "message_receipts" ("messageId", "userId", "deliveredAt", "readAt")
SELECT
  m.id AS "messageId",
  m."receiverId" AS "userId",
  COALESCE(m."createdAt", now()) AS "deliveredAt",
  CASE
    WHEN m.read = true THEN COALESCE(m."updatedAt", m."createdAt", now())
    ELSE NULL
  END AS "readAt"
FROM "messages" m
ON CONFLICT ("messageId", "userId") DO NOTHING;
