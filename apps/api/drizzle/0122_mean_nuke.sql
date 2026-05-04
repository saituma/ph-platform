CREATE TABLE IF NOT EXISTS "program_session_completions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "program_session_completions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"athleteId" integer NOT NULL,
	"sessionId" integer NOT NULL,
	"completedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN IF NOT EXISTS "is_sponsored" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "sponsored_player_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "sponsored_plan_id" integer;--> statement-breakpoint
ALTER TABLE "program_session_completions" ADD CONSTRAINT "program_session_completions_athleteId_athletes_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_session_completions" ADD CONSTRAINT "program_session_completions_sessionId_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "program_session_completions_athlete_idx" ON "program_session_completions" USING btree ("athleteId");--> statement-breakpoint
CREATE UNIQUE INDEX "program_session_completions_unique" ON "program_session_completions" USING btree ("athleteId","sessionId");--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_sponsored_plan_id_subscription_plans_id_fk" FOREIGN KEY ("sponsored_plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;