CREATE TABLE "program_assignments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "program_assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"athleteId" integer NOT NULL,
	"programId" integer NOT NULL,
	"assignedBy" integer NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_modules" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "program_modules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"programId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" varchar(500),
	"order" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "athlete_plan_exercise_completions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "athlete_plan_exercises" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "athlete_plan_session_completions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "athlete_plan_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "athlete_plan_exercise_completions" CASCADE;--> statement-breakpoint
DROP TABLE "athlete_plan_exercises" CASCADE;--> statement-breakpoint
DROP TABLE "athlete_plan_session_completions" CASCADE;--> statement-breakpoint
DROP TABLE "athlete_plan_sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "moduleId" integer;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "title" varchar(255);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "description" varchar(500);--> statement-breakpoint
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_athleteId_athletes_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_programId_programs_id_fk" FOREIGN KEY ("programId") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_assignedBy_users_id_fk" FOREIGN KEY ("assignedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_modules" ADD CONSTRAINT "program_modules_programId_programs_id_fk" FOREIGN KEY ("programId") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "program_assignments_athlete_idx" ON "program_assignments" USING btree ("athleteId");--> statement-breakpoint
CREATE INDEX "program_assignments_program_idx" ON "program_assignments" USING btree ("programId");--> statement-breakpoint
CREATE UNIQUE INDEX "program_assignments_athlete_program_unique" ON "program_assignments" USING btree ("athleteId","programId");--> statement-breakpoint
CREATE INDEX "program_modules_program_idx" ON "program_modules" USING btree ("programId");--> statement-breakpoint
CREATE INDEX "program_modules_program_order_idx" ON "program_modules" USING btree ("programId","order");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_moduleId_program_modules_id_fk" FOREIGN KEY ("moduleId") REFERENCES "public"."program_modules"("id") ON DELETE no action ON UPDATE no action;