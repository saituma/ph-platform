DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'chat_group_category'
  ) THEN
    CREATE TYPE chat_group_category AS ENUM ('announcement', 'coach_group', 'team');
  END IF;
END
$$;

ALTER TABLE chat_groups
  ADD COLUMN IF NOT EXISTS "category" chat_group_category NOT NULL DEFAULT 'coach_group';

-- Backfill best-effort classification for existing groups.
UPDATE chat_groups
SET "category" = CASE
  WHEN lower(name) ~ '(announce|announcement|broadcast)' THEN 'announcement'::chat_group_category
  WHEN lower(name) ~ '(team|squad|club)' THEN 'team'::chat_group_category
  ELSE 'coach_group'::chat_group_category
END
WHERE "category" = 'coach_group'::chat_group_category;

CREATE INDEX IF NOT EXISTS chat_groups_category_created_at_idx
  ON chat_groups ("category", "createdAt" DESC);
