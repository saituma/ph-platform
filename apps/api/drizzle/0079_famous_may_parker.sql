ALTER TABLE "service_types" ADD COLUMN "eligibleTargets" jsonb;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "athleteType" "athlete_type" DEFAULT 'youth' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "minAge" integer;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "maxAge" integer;