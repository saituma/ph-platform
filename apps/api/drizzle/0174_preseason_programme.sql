CREATE TYPE "public"."preseason_session_category" AS ENUM('PRIMER', 'GAME', 'RECOVERY', 'STRENGTH', 'SPEED', 'CONDITIONING');--> statement-breakpoint
CREATE TYPE "public"."preseason_exercise_metric" AS ENUM('reps', 'duration');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "preseason_programmes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "preseason_programmes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" varchar(255) NOT NULL,
	"description" text,
	"weekCount" integer DEFAULT 6 NOT NULL,
	"requiredTier" "program_type",
	"athleteType" "athlete_type" DEFAULT 'adult' NOT NULL,
	"isPublished" boolean DEFAULT false NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "preseason_weeks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "preseason_weeks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"programmeId" integer NOT NULL,
	"weekNumber" integer NOT NULL,
	"title" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "preseason_week_types" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "preseason_week_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"weekId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"order" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "preseason_day_sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "preseason_day_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"weekTypeId" integer NOT NULL,
	"dayOfWeek" integer NOT NULL,
	"category" "preseason_session_category" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"durationLabel" varchar(64),
	"intensityLabel" varchar(64),
	"focusLabel" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "preseason_day_session_exercises" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "preseason_day_session_exercises_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"daySessionId" integer NOT NULL,
	"exerciseId" integer NOT NULL,
	"order" integer NOT NULL,
	"metric" "preseason_exercise_metric" DEFAULT 'reps' NOT NULL,
	"setsOverride" integer,
	"repsOverride" integer,
	"durationOverride" integer,
	"restSecondsOverride" integer,
	"notes" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "preseason_athlete_week_type_selections" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "preseason_athlete_week_type_selections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"athleteId" integer NOT NULL,
	"weekId" integer NOT NULL,
	"weekTypeId" integer NOT NULL,
	"selectedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "preseason_athlete_session_completions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "preseason_athlete_session_completions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"athleteId" integer NOT NULL,
	"daySessionId" integer NOT NULL,
	"completedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "preseason_programmes" ADD CONSTRAINT "preseason_programmes_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preseason_weeks" ADD CONSTRAINT "preseason_weeks_programmeId_preseason_programmes_id_fk" FOREIGN KEY ("programmeId") REFERENCES "public"."preseason_programmes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preseason_week_types" ADD CONSTRAINT "preseason_week_types_weekId_preseason_weeks_id_fk" FOREIGN KEY ("weekId") REFERENCES "public"."preseason_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preseason_day_sessions" ADD CONSTRAINT "preseason_day_sessions_weekTypeId_preseason_week_types_id_fk" FOREIGN KEY ("weekTypeId") REFERENCES "public"."preseason_week_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preseason_day_session_exercises" ADD CONSTRAINT "preseason_day_session_exercises_daySessionId_preseason_day_sessions_id_fk" FOREIGN KEY ("daySessionId") REFERENCES "public"."preseason_day_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preseason_day_session_exercises" ADD CONSTRAINT "preseason_day_session_exercises_exerciseId_exercises_id_fk" FOREIGN KEY ("exerciseId") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preseason_athlete_week_type_selections" ADD CONSTRAINT "preseason_athlete_week_type_selections_athleteId_athletes_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preseason_athlete_week_type_selections" ADD CONSTRAINT "preseason_athlete_week_type_selections_weekId_preseason_weeks_id_fk" FOREIGN KEY ("weekId") REFERENCES "public"."preseason_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preseason_athlete_week_type_selections" ADD CONSTRAINT "preseason_athlete_week_type_selections_weekTypeId_preseason_week_types_id_fk" FOREIGN KEY ("weekTypeId") REFERENCES "public"."preseason_week_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preseason_athlete_session_completions" ADD CONSTRAINT "preseason_athlete_session_completions_athleteId_athletes_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preseason_athlete_session_completions" ADD CONSTRAINT "preseason_athlete_session_completions_daySessionId_preseason_day_sessions_id_fk" FOREIGN KEY ("daySessionId") REFERENCES "public"."preseason_day_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "preseason_weeks_programme_week_unique" ON "preseason_weeks" USING btree ("programmeId","weekNumber");--> statement-breakpoint
CREATE INDEX "preseason_weeks_programme_idx" ON "preseason_weeks" USING btree ("programmeId");--> statement-breakpoint
CREATE INDEX "preseason_week_types_week_idx" ON "preseason_week_types" USING btree ("weekId");--> statement-breakpoint
CREATE UNIQUE INDEX "preseason_day_sessions_week_type_day_unique" ON "preseason_day_sessions" USING btree ("weekTypeId","dayOfWeek");--> statement-breakpoint
CREATE INDEX "preseason_day_sessions_week_type_idx" ON "preseason_day_sessions" USING btree ("weekTypeId");--> statement-breakpoint
CREATE INDEX "preseason_day_session_exercises_session_idx" ON "preseason_day_session_exercises" USING btree ("daySessionId");--> statement-breakpoint
CREATE INDEX "preseason_day_session_exercises_session_order_idx" ON "preseason_day_session_exercises" USING btree ("daySessionId","order");--> statement-breakpoint
CREATE UNIQUE INDEX "preseason_athlete_week_type_selections_unique" ON "preseason_athlete_week_type_selections" USING btree ("athleteId","weekId");--> statement-breakpoint
CREATE INDEX "preseason_athlete_week_type_selections_athlete_idx" ON "preseason_athlete_week_type_selections" USING btree ("athleteId");--> statement-breakpoint
CREATE UNIQUE INDEX "preseason_athlete_session_completions_unique" ON "preseason_athlete_session_completions" USING btree ("athleteId","daySessionId");--> statement-breakpoint
CREATE INDEX "preseason_athlete_session_completions_athlete_idx" ON "preseason_athlete_session_completions" USING btree ("athleteId");--> statement-breakpoint
CREATE INDEX "preseason_programmes_tier_idx" ON "preseason_programmes" USING btree ("requiredTier");--> statement-breakpoint
CREATE INDEX "preseason_programmes_published_idx" ON "preseason_programmes" USING btree ("isPublished");
