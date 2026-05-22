ALTER TABLE "training_other_contents" ADD COLUMN "posterUrl" varchar(500);--> statement-breakpoint
ALTER TABLE "training_other_contents" ADD COLUMN "durationSec" integer;--> statement-breakpoint
ALTER TABLE "training_other_contents" ADD COLUMN "width" integer;--> statement-breakpoint
ALTER TABLE "training_other_contents" ADD COLUMN "height" integer;--> statement-breakpoint
ALTER TABLE "training_session_items" ADD COLUMN "posterUrl" varchar(500);--> statement-breakpoint
ALTER TABLE "training_session_items" ADD COLUMN "durationSec" integer;--> statement-breakpoint
ALTER TABLE "training_session_items" ADD COLUMN "width" integer;--> statement-breakpoint
ALTER TABLE "training_session_items" ADD COLUMN "height" integer;