ALTER TABLE "service_types"
  ADD COLUMN IF NOT EXISTS "eligiblePlans" jsonb,
  ADD COLUMN IF NOT EXISTS "schedulePattern" varchar(32),
  ADD COLUMN IF NOT EXISTS "recurrenceEndMode" varchar(32),
  ADD COLUMN IF NOT EXISTS "recurrenceCount" integer,
  ADD COLUMN IF NOT EXISTS "weeklyEntries" jsonb,
  ADD COLUMN IF NOT EXISTS "oneTimeDate" date,
  ADD COLUMN IF NOT EXISTS "oneTimeTime" varchar(10),
  ADD COLUMN IF NOT EXISTS "slotMode" varchar(32),
  ADD COLUMN IF NOT EXISTS "slotIntervalMinutes" integer,
  ADD COLUMN IF NOT EXISTS "slotDefinitions" jsonb;

UPDATE "service_types"
SET
  "eligiblePlans" = CASE
    WHEN "eligiblePlans" IS NOT NULL THEN "eligiblePlans"
    WHEN "programTier" IS NOT NULL THEN jsonb_build_array("programTier")
    ELSE '[]'::jsonb
  END,
  "schedulePattern" = COALESCE("schedulePattern", CASE WHEN "fixedStartTime" IS NOT NULL THEN 'weekly_recurring' ELSE 'one_time' END),
  "slotMode" = COALESCE("slotMode", 'shared_capacity');

ALTER TABLE "service_types"
  ALTER COLUMN "eligiblePlans" SET DEFAULT '[]'::jsonb,
  ALTER COLUMN "eligiblePlans" SET NOT NULL,
  ALTER COLUMN "schedulePattern" SET DEFAULT 'one_time',
  ALTER COLUMN "schedulePattern" SET NOT NULL,
  ALTER COLUMN "slotMode" SET DEFAULT 'shared_capacity',
  ALTER COLUMN "slotMode" SET NOT NULL;

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "occurrenceKey" varchar(255),
  ADD COLUMN IF NOT EXISTS "slotKey" varchar(255);
