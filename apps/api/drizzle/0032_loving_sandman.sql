ALTER TABLE "guardians" ADD COLUMN IF NOT EXISTS "currentProgramTier" "program_type";--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "videoUploadId" integer;--> statement-breakpoint
ALTER TABLE "onboarding_configs" ADD COLUMN IF NOT EXISTS "phpPlusProgramTabs" jsonb;--> statement-breakpoint
ALTER TABLE "onboarding_configs" ADD COLUMN IF NOT EXISTS "termsVersion" varchar(50) DEFAULT '1.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "onboarding_configs" ADD COLUMN IF NOT EXISTS "privacyVersion" varchar(50) DEFAULT '1.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "physio_refferals" ADD COLUMN IF NOT EXISTS "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "program_section_contents" ADD COLUMN IF NOT EXISTS "ageList" jsonb;--> statement-breakpoint
ALTER TABLE "program_section_contents" ADD COLUMN IF NOT EXISTS "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "stripePriceIdMonthly" varchar(255);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "stripePriceIdYearly" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "expoPushToken" varchar(255);