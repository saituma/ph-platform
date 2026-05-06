ALTER TABLE "session_templates"
ADD COLUMN IF NOT EXISTS "googleSyncEnabled" boolean NOT NULL DEFAULT false;

ALTER TABLE "scheduled_sessions"
ADD COLUMN IF NOT EXISTS "googleEventId" varchar(255);

CREATE INDEX IF NOT EXISTS "scheduled_sessions_google_event_id_idx"
ON "scheduled_sessions" USING btree ("googleEventId");
