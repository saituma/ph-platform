ALTER TABLE "athletes" ADD COLUMN IF NOT EXISTS "planExpiresAt" timestamp;
ALTER TABLE "athletes" ADD COLUMN IF NOT EXISTS "planRenewalReminderSentAt" timestamp;
