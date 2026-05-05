ALTER TABLE "athletes"
ADD COLUMN IF NOT EXISTS "preferred_training_days" jsonb NOT NULL DEFAULT '[]'::jsonb;
