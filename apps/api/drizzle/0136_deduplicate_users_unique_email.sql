-- Step 1: Mark duplicate active users as deleted, keeping only the oldest (lowest id) per email.
-- This handles the "Piers Hatcliff x198" problem.
UPDATE "users" u
SET "isDeleted" = true,
    "updatedAt" = now()
WHERE u."isDeleted" = false
  AND u."id" NOT IN (
    SELECT MIN(u2."id")
    FROM "users" u2
    WHERE u2."isDeleted" = false
    GROUP BY LOWER(u2."email")
  );
--> statement-breakpoint
-- Step 2: Add a partial unique index on email for active (non-deleted) users.
-- This prevents future duplicate registrations at the database level.
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_active_unique"
  ON "users" (LOWER("email"))
  WHERE "isDeleted" = false;
