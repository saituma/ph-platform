ALTER TABLE "chat_group_members"
ADD COLUMN IF NOT EXISTS "lastReadAt" timestamp;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_group_members'
      AND column_name = 'last_read_at'
  ) THEN
    EXECUTE 'UPDATE "chat_group_members" SET "lastReadAt" = COALESCE("lastReadAt", "last_read_at") WHERE "lastReadAt" IS NULL';
  END IF;
END $$;

