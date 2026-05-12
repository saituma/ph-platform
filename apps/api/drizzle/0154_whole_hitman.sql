CREATE TABLE IF NOT EXISTS "athlete_injury_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "athlete_injury_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"athlete_id" integer NOT NULL,
	"logged_by_user_id" integer NOT NULL,
	"description" text NOT NULL,
	"body_part" varchar(100),
	"severity" varchar(20) DEFAULT 'mild' NOT NULL,
	"occurred_at" date NOT NULL,
	"resolved_at" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "athlete_injury_logs_athlete_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "athlete_injury_logs_logged_by_fk" FOREIGN KEY ("logged_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guardian_feedback_reply" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "guardian_feedback_reply_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"feedback_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guardian_feedback_reply_feedback_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."guardian_feedback"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "guardian_feedback_reply_sender_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guardian_feedback" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "guardian_feedback_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guardian_user_id" integer NOT NULL,
	"subject" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guardian_feedback_user_fk" FOREIGN KEY ("guardian_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_streaks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_streaks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"total_days" integer DEFAULT 0 NOT NULL,
	"total_sessions" integer DEFAULT 0 NOT NULL,
	"total_minutes" integer DEFAULT 0 NOT NULL,
	"completed_dates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"freezes_available" integer DEFAULT 0 NOT NULL,
	"freezes_used_dates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"timezone" text,
	"last_activity_date" varchar(10),
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_streaks_userId_unique" UNIQUE("userId"),
	CONSTRAINT "user_streaks_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
ALTER TABLE "user_streaks" ADD COLUMN IF NOT EXISTS "freezes_available" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_streaks" ADD COLUMN IF NOT EXISTS "freezes_used_dates" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user_streaks" ADD COLUMN IF NOT EXISTS "timezone" text;--> statement-breakpoint
ALTER TABLE "program_modules" ALTER COLUMN "programId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "programId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD COLUMN IF NOT EXISTS "setsOverride" integer;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD COLUMN IF NOT EXISTS "repsOverride" integer;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD COLUMN IF NOT EXISTS "durationOverride" integer;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD COLUMN IF NOT EXISTS "restSecondsOverride" integer;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "teamId" integer;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "stripePriceIdWeekly" varchar(255);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "weeklyPrice" varchar(100);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "injury_logs_athlete_idx" ON "athlete_injury_logs" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guardian_feedback_reply_feedback_idx" ON "guardian_feedback_reply" USING btree ("feedback_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guardian_feedback_user_idx" ON "guardian_feedback" USING btree ("guardian_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "athletes_user_id_idx" ON "athletes" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "athletes_guardian_id_idx" ON "athletes" USING btree ("guardianId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "athletes_current_program_tier_idx" ON "athletes" USING btree ("currentProgramTier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "athletes_team_id_idx" ON "athletes" USING btree ("teamId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_athlete_id_idx" ON "bookings" USING btree ("athleteId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_guardian_id_idx" ON "bookings" USING btree ("guardianId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_starts_at_idx" ON "bookings" USING btree ("startsAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contents_surface_idx" ON "contents" USING btree ("surface");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contents_surface_is_active_idx" ON "contents" USING btree ("surface","isActive");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guardians_user_id_idx" ON "guardians" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" USING btree ("userId","read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_requests_user_id_idx" ON "subscription_requests" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_requests_athlete_id_idx" ON "subscription_requests" USING btree ("athleteId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_requests_status_idx" ON "subscription_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_uploads_athlete_id_idx" ON "video_uploads" USING btree ("athleteId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_uploads_reviewed_at_idx" ON "video_uploads" USING btree ("reviewedAt");
