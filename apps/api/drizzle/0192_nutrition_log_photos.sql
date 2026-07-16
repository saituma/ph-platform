-- Athletes can now attach food photos to a meal when logging nutrition.
-- One row per photo, keyed by log + meal slot; cascades away with the log.

CREATE TABLE IF NOT EXISTS "nutrition_log_photos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "nutrition_log_photos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"logId" integer NOT NULL,
	"mealSlot" varchar(30) NOT NULL,
	"url" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "nutrition_log_photos" ADD CONSTRAINT "nutrition_log_photos_logId_nutrition_logs_id_fk" FOREIGN KEY ("logId") REFERENCES "public"."nutrition_logs"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nutrition_log_photos_log_idx" ON "nutrition_log_photos" USING btree ("logId");
