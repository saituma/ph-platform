ALTER TABLE "admin_settings"
ADD COLUMN IF NOT EXISTS "googleCalendarId" varchar(255);

ALTER TABLE "admin_settings"
ADD COLUMN IF NOT EXISTS "googleServiceAccountEmail" varchar(255);

ALTER TABLE "admin_settings"
ADD COLUMN IF NOT EXISTS "googleServiceAccountPrivateKey" text;

ALTER TABLE "admin_settings"
ADD COLUMN IF NOT EXISTS "googleCalendarConnectedAt" timestamp;
