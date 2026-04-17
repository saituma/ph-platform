CREATE TABLE "athlete_training_session_workout_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "athlete_training_session_workout_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"athleteId" integer NOT NULL,
	"sessionId" integer NOT NULL,
	"weightsUsed" text,
	"repsCompleted" text,
	"rpe" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN "teamId" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD COLUMN "snacksMorning" text;--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD COLUMN "snacksAfternoon" text;--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD COLUMN "snacksEvening" text;--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD COLUMN "steps" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD COLUMN "sleepHours" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD COLUMN "coachFeedbackMediaUrl" text;--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD COLUMN "coachFeedbackMediaType" varchar(20);--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN "description" varchar(2000);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "adminId" integer;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "planId" integer;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "maxAthletes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "subscriptionStatus" "subscription_status" DEFAULT 'pending_payment';--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "planExpiresAt" timestamp;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "stripeSubscriptionId" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nutrition_reminder_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nutrition_reminder_time_local" varchar(5);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nutrition_reminder_timezone" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_nutrition_reminder_date_key" varchar(10);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_nutrition_reminder_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "video_uploads" ADD COLUMN "trainingSessionItemId" integer;--> statement-breakpoint
ALTER TABLE "athlete_training_session_workout_logs" ADD CONSTRAINT "athlete_training_session_workout_logs_athleteId_athletes_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_training_session_workout_logs" ADD CONSTRAINT "athlete_training_session_workout_logs_sessionId_training_module_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."training_module_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "athlete_training_session_workout_logs_athlete_idx" ON "athlete_training_session_workout_logs" USING btree ("athleteId");--> statement-breakpoint
CREATE INDEX "athlete_training_session_workout_logs_session_idx" ON "athlete_training_session_workout_logs" USING btree ("sessionId");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_training_session_workout_logs_unique" ON "athlete_training_session_workout_logs" USING btree ("athleteId","sessionId");--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_teamId_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_adminId_users_id_fk" FOREIGN KEY ("adminId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_planId_subscription_plans_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_uploads" ADD CONSTRAINT "video_uploads_trainingSessionItemId_training_session_items_id_fk" FOREIGN KEY ("trainingSessionItemId") REFERENCES "public"."training_session_items"("id") ON DELETE no action ON UPDATE no action;