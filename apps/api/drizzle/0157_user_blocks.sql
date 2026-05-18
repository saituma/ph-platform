CREATE TABLE IF NOT EXISTS "user_blocks" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "blockerId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "blockedId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_blocks_blocker_blocked_unique"
ON "user_blocks" ("blockerId", "blockedId");

CREATE INDEX IF NOT EXISTS "user_blocks_blocker_idx"
ON "user_blocks" ("blockerId");

CREATE INDEX IF NOT EXISTS "user_blocks_blocked_idx"
ON "user_blocks" ("blockedId");
