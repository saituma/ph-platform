-- Activity sessions are checkpointed locally; only final lifecycle metadata is synced.
ALTER TABLE "run_logs" ADD COLUMN IF NOT EXISTS "activity_lifecycle" varchar(20);

-- New activities must never be discoverable unless the athlete explicitly shares them.
ALTER TABLE "run_logs" ALTER COLUMN "visibility" SET DEFAULT 'private';
