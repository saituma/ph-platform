ALTER TABLE "guardians" ADD COLUMN "currentProgramTier" "program_type";--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "videoUploadId" integer;--> statement-breakpoint
ALTER TABLE "onboarding_configs" ADD COLUMN "phpPlusProgramTabs" jsonb;--> statement-breakpoint
ALTER TABLE "onboarding_configs" ADD COLUMN "termsVersion" varchar(50) DEFAULT '1.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "onboarding_configs" ADD COLUMN "privacyVersion" varchar(50) DEFAULT '1.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "physio_refferals" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "program_section_contents" ADD COLUMN "ageList" jsonb;--> statement-breakpoint
ALTER TABLE "program_section_contents" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "stripePriceIdMonthly" varchar(255);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "stripePriceIdYearly" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "expoPushToken" varchar(255);