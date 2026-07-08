CREATE TYPE "public"."content_audience" AS ENUM('all', 'adult', 'youth', 'team', 'all_teams');--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN IF NOT EXISTS "audience_type" "content_audience";--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN IF NOT EXISTS "audience_team" varchar(255);
