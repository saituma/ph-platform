-- Per-meal (breakfast/lunch/dinner) reminder de-dupe markers, on by default

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "meal_reminder_enabled" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "last_breakfast_reminder_date_key" varchar(10),
  ADD COLUMN IF NOT EXISTS "last_lunch_reminder_date_key" varchar(10),
  ADD COLUMN IF NOT EXISTS "last_dinner_reminder_date_key" varchar(10);
