-- Nutrition log daily reminder settings + de-dupe markers

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "nutrition_reminder_enabled" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "nutrition_reminder_time_local" varchar(5),
  ADD COLUMN IF NOT EXISTS "nutrition_reminder_timezone" varchar(100),
  ADD COLUMN IF NOT EXISTS "last_nutrition_reminder_date_key" varchar(10),
  ADD COLUMN IF NOT EXISTS "last_nutrition_reminder_sent_at" timestamp;
