ALTER TABLE "service_types"
  ADD COLUMN IF NOT EXISTS "attendeeVisibility" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "defaultLocation" varchar(500),
  ADD COLUMN IF NOT EXISTS "defaultMeetingLink" varchar(500),
  ADD COLUMN IF NOT EXISTS "schedulePattern" varchar(32),
  ADD COLUMN IF NOT EXISTS "recurrenceEndMode" varchar(32),
  ADD COLUMN IF NOT EXISTS "recurrenceCount" integer,
  ADD COLUMN IF NOT EXISTS "weeklyEntries" jsonb,
  ADD COLUMN IF NOT EXISTS "oneTimeDate" date,
  ADD COLUMN IF NOT EXISTS "oneTimeTime" varchar(10),
  ADD COLUMN IF NOT EXISTS "slotMode" varchar(32),
  ADD COLUMN IF NOT EXISTS "slotIntervalMinutes" integer,
  ADD COLUMN IF NOT EXISTS "slotDefinitions" jsonb;

