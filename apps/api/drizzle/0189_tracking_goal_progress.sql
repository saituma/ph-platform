-- Persisted per-athlete goal completion + manual progress logs (reps/custom units).
-- Completion is inserted via ON CONFLICT DO NOTHING RETURNING at the service layer, not
-- read-then-write, so a race between two syncs never double-fires a notification.

CREATE TABLE IF NOT EXISTS "tracking_goal_completions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tracking_goal_completions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"goalId" integer NOT NULL,
	"athleteId" integer NOT NULL,
	"completedAt" timestamp DEFAULT now() NOT NULL,
	"completionValue" double precision NOT NULL,
	"source" varchar(20) DEFAULT 'auto' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tracking_goal_progress_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tracking_goal_progress_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"goalId" integer NOT NULL,
	"athleteId" integer NOT NULL,
	"value" double precision NOT NULL,
	"note" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "tracking_goal_completions" ADD CONSTRAINT "tracking_goal_completions_goalId_tracking_goals_id_fk" FOREIGN KEY ("goalId") REFERENCES "public"."tracking_goals"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "tracking_goal_completions" ADD CONSTRAINT "tracking_goal_completions_athleteId_athletes_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "tracking_goal_progress_logs" ADD CONSTRAINT "tracking_goal_progress_logs_goalId_tracking_goals_id_fk" FOREIGN KEY ("goalId") REFERENCES "public"."tracking_goals"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "tracking_goal_progress_logs" ADD CONSTRAINT "tracking_goal_progress_logs_athleteId_athletes_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tracking_goal_completions_goal_athlete_unique" ON "tracking_goal_completions" USING btree ("goalId","athleteId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tracking_goal_completions_athlete_idx" ON "tracking_goal_completions" USING btree ("athleteId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tracking_goal_progress_logs_goal_athlete_idx" ON "tracking_goal_progress_logs" USING btree ("goalId","athleteId");
