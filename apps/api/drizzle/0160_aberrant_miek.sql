ALTER TABLE "guardians" DROP CONSTRAINT "guardians_activeAthleteId_athletes_id_fk";
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "posterUrl" varchar(500);--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "durationSec" integer;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "width" integer;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "height" integer;--> statement-breakpoint
ALTER TABLE "program_section_contents" ADD COLUMN "posterUrl" varchar(500);--> statement-breakpoint
ALTER TABLE "program_section_contents" ADD COLUMN "durationSec" integer;--> statement-breakpoint
ALTER TABLE "program_section_contents" ADD COLUMN "width" integer;--> statement-breakpoint
ALTER TABLE "program_section_contents" ADD COLUMN "height" integer;--> statement-breakpoint
ALTER TABLE "video_uploads" ADD COLUMN "poster_url" varchar(500);--> statement-breakpoint
ALTER TABLE "video_uploads" ADD COLUMN "duration_sec" integer;--> statement-breakpoint
ALTER TABLE "video_uploads" ADD COLUMN "width" integer;--> statement-breakpoint
ALTER TABLE "video_uploads" ADD COLUMN "height" integer;--> statement-breakpoint
ALTER TABLE "video_uploads" ADD COLUMN "coach_video_poster_url" varchar(500);