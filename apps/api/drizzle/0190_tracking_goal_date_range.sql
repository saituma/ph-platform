-- Goals get an explicit start date (progress window) alongside the existing due date,
-- which is renamed to endDate to match. Existing rows keep their due date as endDate;
-- startDate is left null and the service falls back to createdAt for those.

ALTER TABLE "tracking_goals" RENAME COLUMN "dueDate" TO "endDate";--> statement-breakpoint
ALTER TABLE "tracking_goals" ADD COLUMN IF NOT EXISTS "startDate" date;
