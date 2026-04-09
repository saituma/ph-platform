DO $$ BEGIN
  CREATE TYPE "public"."athlete_type" AS ENUM('youth', 'adult');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."plan_payment_type" AS ENUM('monthly', 'upfront');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."chat_group_category" AS ENUM('announcement', 'coach_group', 'team');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."story_media_type" AS ENUM('image', 'video');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."training_other_type" AS ENUM('warmup', 'cooldown', 'mobility', 'recovery', 'inseason', 'offseason', 'education');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."training_session_block_type" AS ENUM('warmup', 'main', 'cooldown');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TYPE "public"."session_type" ADD VALUE IF NOT EXISTS 'screening' BEFORE 'mobility';--> statement-breakpoint
CREATE TABLE "athlete_achievement_unlocks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "athlete_achievement_unlocks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"athleteId" integer NOT NULL,
	"achievementKey" varchar(64) NOT NULL,
	"unlockedAt" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athlete_plan_exercise_completions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "athlete_plan_exercise_completions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"athleteId" integer NOT NULL,
	"planExerciseId" integer NOT NULL,
	"completedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athlete_plan_exercises" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "athlete_plan_exercises_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"planSessionId" integer NOT NULL,
	"exerciseId" integer NOT NULL,
	"order" integer NOT NULL,
	"sets" integer,
	"reps" integer,
	"duration" integer,
	"restSeconds" integer,
	"coachingNotes" varchar(500),
	"progressionNotes" varchar(500),
	"regressionNotes" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athlete_plan_session_completions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "athlete_plan_session_completions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"athleteId" integer NOT NULL,
	"planSessionId" integer NOT NULL,
	"rpe" integer,
	"soreness" integer,
	"fatigue" integer,
	"notes" varchar(500),
	"completedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athlete_plan_sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "athlete_plan_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"athleteId" integer NOT NULL,
	"weekNumber" integer NOT NULL,
	"sessionNumber" integer NOT NULL,
	"title" varchar(255),
	"notes" varchar(500),
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athlete_training_session_completions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "athlete_training_session_completions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"athleteId" integer NOT NULL,
	"sessionId" integer NOT NULL,
	"completedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athlete_training_session_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "athlete_training_session_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"athleteId" integer NOT NULL,
	"weekNumber" integer,
	"sessionLabel" varchar(500),
	"programKey" varchar(32),
	"contentIds" jsonb NOT NULL,
	"exerciseCount" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_section_completions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "program_section_completions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"athleteId" integer NOT NULL,
	"programSectionContentId" integer NOT NULL,
	"rpe" integer,
	"soreness" integer,
	"fatigue" integer,
	"notes" varchar(500),
	"completedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_group_members" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "referral_group_members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"groupId" integer NOT NULL,
	"athleteId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_groups" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "referral_groups_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"expectedSize" integer DEFAULT 0 NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "run_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"clientId" varchar(64) NOT NULL,
	"userId" integer NOT NULL,
	"date" timestamp NOT NULL,
	"distanceMeters" double precision NOT NULL,
	"durationSeconds" integer NOT NULL,
	"avgPace" double precision,
	"avgSpeed" double precision,
	"calories" double precision,
	"coordinates" jsonb,
	"effortLevel" integer,
	"feelTags" jsonb,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" varchar(255) NOT NULL,
	"mediaUrl" varchar(500) NOT NULL,
	"mediaType" "story_media_type" DEFAULT 'image' NOT NULL,
	"badge" varchar(50),
	"order" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_audiences" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "training_audiences_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"label" varchar(64) NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_module_sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "training_module_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"moduleId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"dayLength" integer DEFAULT 7 NOT NULL,
	"order" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_modules" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "training_modules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"age" integer NOT NULL,
	"audienceLabel" varchar(64) DEFAULT 'All' NOT NULL,
	"title" varchar(255) NOT NULL,
	"order" integer DEFAULT 1 NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_module_tier_locks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "training_module_tier_locks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"audienceLabel" varchar(64) NOT NULL,
	"programTier" "program_type" NOT NULL,
	"startModuleId" integer NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_other_contents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "training_other_contents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"age" integer NOT NULL,
	"audienceLabel" varchar(64) DEFAULT 'All' NOT NULL,
	"type" "training_other_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"scheduleNote" varchar(255),
	"videoUrl" varchar(500),
	"metadata" jsonb,
	"order" integer DEFAULT 1 NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_other_settings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "training_other_settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"audienceLabel" varchar(64) NOT NULL,
	"type" "training_other_type" NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_session_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "training_session_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sessionId" integer NOT NULL,
	"blockType" "training_session_block_type" DEFAULT 'main' NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"videoUrl" varchar(500),
	"allowVideoUpload" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"order" integer DEFAULT 1 NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_session_tier_locks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "training_session_tier_locks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"moduleId" integer NOT NULL,
	"programTier" "program_type" NOT NULL,
	"startSessionId" integer NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "athletes" ALTER COLUMN "currentProgramTier" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "contents" ALTER COLUMN "programTier" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "enrollments" ALTER COLUMN "programType" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "guardians" ALTER COLUMN "currentProgramTier" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "onboarding_configs" ALTER COLUMN "defaultProgramTier" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "onboarding_configs" ALTER COLUMN "defaultProgramTier" SET DEFAULT 'PHP'::text;--> statement-breakpoint
ALTER TABLE "parent_courses" ALTER COLUMN "programTier" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "physio_refferals" ALTER COLUMN "programTier" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "program_section_contents" ALTER COLUMN "programTier" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "programs" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "service_types" ALTER COLUMN "programTier" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "subscription_plans" ALTER COLUMN "tier" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "training_module_tier_locks" ALTER COLUMN "programTier" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "training_session_tier_locks" ALTER COLUMN "programTier" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."program_type";--> statement-breakpoint
CREATE TYPE "public"."program_type" AS ENUM('PHP', 'PHP_Premium', 'PHP_Premium_Plus', 'PHP_Pro');--> statement-breakpoint
ALTER TABLE "athletes" ALTER COLUMN "currentProgramTier" SET DATA TYPE "public"."program_type" USING "currentProgramTier"::"public"."program_type";--> statement-breakpoint
ALTER TABLE "contents" ALTER COLUMN "programTier" SET DATA TYPE "public"."program_type" USING "programTier"::"public"."program_type";--> statement-breakpoint
ALTER TABLE "enrollments" ALTER COLUMN "programType" SET DATA TYPE "public"."program_type" USING "programType"::"public"."program_type";--> statement-breakpoint
ALTER TABLE "guardians" ALTER COLUMN "currentProgramTier" SET DATA TYPE "public"."program_type" USING "currentProgramTier"::"public"."program_type";--> statement-breakpoint
ALTER TABLE "onboarding_configs" ALTER COLUMN "defaultProgramTier" SET DEFAULT 'PHP'::"public"."program_type";--> statement-breakpoint
ALTER TABLE "onboarding_configs" ALTER COLUMN "defaultProgramTier" SET DATA TYPE "public"."program_type" USING "defaultProgramTier"::"public"."program_type";--> statement-breakpoint
ALTER TABLE "parent_courses" ALTER COLUMN "programTier" SET DATA TYPE "public"."program_type" USING "programTier"::"public"."program_type";--> statement-breakpoint
ALTER TABLE "physio_refferals" ALTER COLUMN "programTier" SET DATA TYPE "public"."program_type" USING "programTier"::"public"."program_type";--> statement-breakpoint
ALTER TABLE "program_section_contents" ALTER COLUMN "programTier" SET DATA TYPE "public"."program_type" USING "programTier"::"public"."program_type";--> statement-breakpoint
ALTER TABLE "programs" ALTER COLUMN "type" SET DATA TYPE "public"."program_type" USING "type"::"public"."program_type";--> statement-breakpoint
ALTER TABLE "service_types" ALTER COLUMN "programTier" SET DATA TYPE "public"."program_type" USING "programTier"::"public"."program_type";--> statement-breakpoint
ALTER TABLE "subscription_plans" ALTER COLUMN "tier" SET DATA TYPE "public"."program_type" USING "tier"::"public"."program_type";--> statement-breakpoint
ALTER TABLE "training_module_tier_locks" ALTER COLUMN "programTier" SET DATA TYPE "public"."program_type" USING "programTier"::"public"."program_type";--> statement-breakpoint
ALTER TABLE "training_session_tier_locks" ALTER COLUMN "programTier" SET DATA TYPE "public"."program_type" USING "programTier"::"public"."program_type";--> statement-breakpoint
ALTER TABLE "athletes" ALTER COLUMN "guardianId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_settings" ADD COLUMN "messagingEnabledTiers" jsonb;--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN "athleteType" "athlete_type" DEFAULT 'youth' NOT NULL;--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN "planPaymentType" "plan_payment_type";--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN "planCommitmentMonths" integer;--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN "planExpiresAt" timestamp;--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN "planRenewalReminderSentAt" timestamp;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "occurrenceKey" varchar(255);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "slotKey" varchar(255);--> statement-breakpoint
ALTER TABLE "chat_group_members" ADD COLUMN "lastReadAt" timestamp;--> statement-breakpoint
ALTER TABLE "chat_groups" ADD COLUMN "category" "chat_group_category" DEFAULT 'coach_group' NOT NULL;--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN "startsAt" timestamp;--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN "endsAt" timestamp;--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN "isActive" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "program_section_contents" ADD COLUMN "allowVideoUpload" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN "eligiblePlans" jsonb;--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN "schedulePattern" varchar(32);--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN "recurrenceEndMode" varchar(32);--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN "recurrenceCount" integer;--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN "weeklyEntries" jsonb;--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN "oneTimeDate" date;--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN "oneTimeTime" varchar(10);--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN "slotMode" varchar(32);--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN "slotIntervalMinutes" integer;--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN "slotDefinitions" jsonb;--> statement-breakpoint
ALTER TABLE "video_uploads" ADD COLUMN "programSectionContentId" integer;--> statement-breakpoint
ALTER TABLE "athlete_achievement_unlocks" ADD CONSTRAINT "athlete_achievement_unlocks_athleteId_athletes_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_plan_exercise_completions" ADD CONSTRAINT "athlete_plan_exercise_completions_athleteId_athletes_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_plan_exercise_completions" ADD CONSTRAINT "athlete_plan_exercise_completions_planExerciseId_athlete_plan_exercises_id_fk" FOREIGN KEY ("planExerciseId") REFERENCES "public"."athlete_plan_exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_plan_exercises" ADD CONSTRAINT "athlete_plan_exercises_planSessionId_athlete_plan_sessions_id_fk" FOREIGN KEY ("planSessionId") REFERENCES "public"."athlete_plan_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_plan_exercises" ADD CONSTRAINT "athlete_plan_exercises_exerciseId_exercises_id_fk" FOREIGN KEY ("exerciseId") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_plan_session_completions" ADD CONSTRAINT "athlete_plan_session_completions_athleteId_athletes_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_plan_session_completions" ADD CONSTRAINT "athlete_plan_session_completions_planSessionId_athlete_plan_sessions_id_fk" FOREIGN KEY ("planSessionId") REFERENCES "public"."athlete_plan_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_plan_sessions" ADD CONSTRAINT "athlete_plan_sessions_athleteId_athletes_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_plan_sessions" ADD CONSTRAINT "athlete_plan_sessions_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_training_session_completions" ADD CONSTRAINT "athlete_training_session_completions_athleteId_athletes_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_training_session_completions" ADD CONSTRAINT "athlete_training_session_completions_sessionId_training_module_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."training_module_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_training_session_logs" ADD CONSTRAINT "athlete_training_session_logs_athleteId_athletes_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_section_completions" ADD CONSTRAINT "program_section_completions_athleteId_athletes_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_section_completions" ADD CONSTRAINT "program_section_completions_programSectionContentId_program_section_contents_id_fk" FOREIGN KEY ("programSectionContentId") REFERENCES "public"."program_section_contents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_group_members" ADD CONSTRAINT "referral_group_members_groupId_referral_groups_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."referral_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_group_members" ADD CONSTRAINT "referral_group_members_athleteId_athletes_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_groups" ADD CONSTRAINT "referral_groups_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_logs" ADD CONSTRAINT "run_logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_audiences" ADD CONSTRAINT "training_audiences_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_module_sessions" ADD CONSTRAINT "training_module_sessions_moduleId_training_modules_id_fk" FOREIGN KEY ("moduleId") REFERENCES "public"."training_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_modules" ADD CONSTRAINT "training_modules_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_module_tier_locks" ADD CONSTRAINT "training_module_tier_locks_startModuleId_training_modules_id_fk" FOREIGN KEY ("startModuleId") REFERENCES "public"."training_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_module_tier_locks" ADD CONSTRAINT "training_module_tier_locks_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_other_contents" ADD CONSTRAINT "training_other_contents_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_other_settings" ADD CONSTRAINT "training_other_settings_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_session_items" ADD CONSTRAINT "training_session_items_sessionId_training_module_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."training_module_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_session_items" ADD CONSTRAINT "training_session_items_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_session_tier_locks" ADD CONSTRAINT "training_session_tier_locks_moduleId_training_modules_id_fk" FOREIGN KEY ("moduleId") REFERENCES "public"."training_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_session_tier_locks" ADD CONSTRAINT "training_session_tier_locks_startSessionId_training_module_sessions_id_fk" FOREIGN KEY ("startSessionId") REFERENCES "public"."training_module_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_session_tier_locks" ADD CONSTRAINT "training_session_tier_locks_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "athlete_achievement_unlocks_athlete_idx" ON "athlete_achievement_unlocks" USING btree ("athleteId");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_achievement_unlocks_athlete_key_unique" ON "athlete_achievement_unlocks" USING btree ("athleteId","achievementKey");--> statement-breakpoint
CREATE INDEX "athlete_plan_exercise_completions_athlete_idx" ON "athlete_plan_exercise_completions" USING btree ("athleteId");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_plan_exercise_completions_unique" ON "athlete_plan_exercise_completions" USING btree ("athleteId","planExerciseId");--> statement-breakpoint
CREATE INDEX "athlete_plan_exercise_completions_completed_at_idx" ON "athlete_plan_exercise_completions" USING btree ("completedAt");--> statement-breakpoint
CREATE INDEX "athlete_plan_exercises_session_idx" ON "athlete_plan_exercises" USING btree ("planSessionId");--> statement-breakpoint
CREATE INDEX "athlete_plan_session_completions_athlete_idx" ON "athlete_plan_session_completions" USING btree ("athleteId");--> statement-breakpoint
CREATE INDEX "athlete_plan_session_completions_session_idx" ON "athlete_plan_session_completions" USING btree ("planSessionId");--> statement-breakpoint
CREATE INDEX "athlete_plan_session_completions_completed_at_idx" ON "athlete_plan_session_completions" USING btree ("completedAt");--> statement-breakpoint
CREATE INDEX "athlete_plan_sessions_athlete_idx" ON "athlete_plan_sessions" USING btree ("athleteId");--> statement-breakpoint
CREATE INDEX "athlete_plan_sessions_week_idx" ON "athlete_plan_sessions" USING btree ("weekNumber");--> statement-breakpoint
CREATE INDEX "athlete_training_session_completions_athlete_idx" ON "athlete_training_session_completions" USING btree ("athleteId");--> statement-breakpoint
CREATE INDEX "athlete_training_session_completions_session_idx" ON "athlete_training_session_completions" USING btree ("sessionId");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_training_session_completions_unique" ON "athlete_training_session_completions" USING btree ("athleteId","sessionId");--> statement-breakpoint
CREATE INDEX "athlete_training_session_logs_athlete_idx" ON "athlete_training_session_logs" USING btree ("athleteId");--> statement-breakpoint
CREATE INDEX "athlete_training_session_logs_created_idx" ON "athlete_training_session_logs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "program_section_completions_athlete_idx" ON "program_section_completions" USING btree ("athleteId");--> statement-breakpoint
CREATE INDEX "program_section_completions_content_idx" ON "program_section_completions" USING btree ("programSectionContentId");--> statement-breakpoint
CREATE INDEX "program_section_completions_completed_at_idx" ON "program_section_completions" USING btree ("completedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_group_members_group_athlete_unique" ON "referral_group_members" USING btree ("groupId","athleteId");--> statement-breakpoint
CREATE INDEX "referral_group_members_group_idx" ON "referral_group_members" USING btree ("groupId");--> statement-breakpoint
CREATE INDEX "referral_group_members_athlete_idx" ON "referral_group_members" USING btree ("athleteId");--> statement-breakpoint
CREATE INDEX "run_logs_user_idx" ON "run_logs" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "run_logs_client_id_user_unique" ON "run_logs" USING btree ("clientId","userId");--> statement-breakpoint
CREATE INDEX "run_logs_date_idx" ON "run_logs" USING btree ("date");--> statement-breakpoint
CREATE INDEX "stories_is_active_idx" ON "stories" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "stories_order_idx" ON "stories" USING btree ("order");--> statement-breakpoint
CREATE UNIQUE INDEX "training_audiences_label_unique" ON "training_audiences" USING btree ("label");--> statement-breakpoint
CREATE INDEX "training_module_sessions_module_idx" ON "training_module_sessions" USING btree ("moduleId");--> statement-breakpoint
CREATE INDEX "training_module_sessions_module_order_idx" ON "training_module_sessions" USING btree ("moduleId","order");--> statement-breakpoint
CREATE INDEX "training_modules_age_idx" ON "training_modules" USING btree ("age");--> statement-breakpoint
CREATE INDEX "training_modules_age_order_idx" ON "training_modules" USING btree ("age","order");--> statement-breakpoint
CREATE UNIQUE INDEX "training_module_tier_locks_audience_tier_unique" ON "training_module_tier_locks" USING btree ("audienceLabel","programTier");--> statement-breakpoint
CREATE INDEX "training_module_tier_locks_audience_tier_idx" ON "training_module_tier_locks" USING btree ("audienceLabel","programTier");--> statement-breakpoint
CREATE INDEX "training_module_tier_locks_module_idx" ON "training_module_tier_locks" USING btree ("startModuleId");--> statement-breakpoint
CREATE INDEX "training_other_contents_age_type_idx" ON "training_other_contents" USING btree ("age","type");--> statement-breakpoint
CREATE INDEX "training_other_contents_age_type_order_idx" ON "training_other_contents" USING btree ("age","type","order");--> statement-breakpoint
CREATE UNIQUE INDEX "training_other_settings_audience_type_unique" ON "training_other_settings" USING btree ("audienceLabel","type");--> statement-breakpoint
CREATE INDEX "training_other_settings_audience_type_idx" ON "training_other_settings" USING btree ("audienceLabel","type");--> statement-breakpoint
CREATE INDEX "training_session_items_session_idx" ON "training_session_items" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "training_session_items_session_block_order_idx" ON "training_session_items" USING btree ("sessionId","blockType","order");--> statement-breakpoint
CREATE UNIQUE INDEX "training_session_tier_locks_module_tier_unique" ON "training_session_tier_locks" USING btree ("moduleId","programTier");--> statement-breakpoint
CREATE INDEX "training_session_tier_locks_module_tier_idx" ON "training_session_tier_locks" USING btree ("moduleId","programTier");--> statement-breakpoint
CREATE INDEX "training_session_tier_locks_session_idx" ON "training_session_tier_locks" USING btree ("startSessionId");--> statement-breakpoint
ALTER TABLE "video_uploads" ADD CONSTRAINT "video_uploads_programSectionContentId_program_section_contents_id_fk" FOREIGN KEY ("programSectionContentId") REFERENCES "public"."program_section_contents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_group_members_group_user_unique" ON "chat_group_members" USING btree ("groupId","userId");--> statement-breakpoint
CREATE INDEX "chat_group_members_group_idx" ON "chat_group_members" USING btree ("groupId");--> statement-breakpoint
CREATE INDEX "chat_group_members_user_idx" ON "chat_group_members" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "chat_group_message_reactions_message_idx" ON "chat_group_message_reactions" USING btree ("messageId");--> statement-breakpoint
CREATE INDEX "chat_group_messages_group_idx" ON "chat_group_messages" USING btree ("groupId");--> statement-breakpoint
CREATE INDEX "message_reactions_message_idx" ON "message_reactions" USING btree ("messageId");--> statement-breakpoint
CREATE INDEX "messages_sender_id_idx" ON "messages" USING btree ("senderId");--> statement-breakpoint
CREATE INDEX "messages_receiver_id_idx" ON "messages" USING btree ("receiverId");
