ALTER TABLE "session_exercises" ADD COLUMN "run_config" jsonb;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "source_library_session_id" integer;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_source_library_session_id_sessions_id_fk" FOREIGN KEY ("source_library_session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;
