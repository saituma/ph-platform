DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'booking_type' AND e.enumlabel = 'one_on_one'
  ) THEN
    ALTER TYPE "public"."booking_type" ADD VALUE 'one_on_one';
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'content_surface' AND e.enumlabel = 'legal'
  ) THEN
    ALTER TYPE "public"."content_surface" ADD VALUE 'legal';
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'content_surface' AND e.enumlabel = 'announcements'
  ) THEN
    ALTER TYPE "public"."content_surface" ADD VALUE 'announcements';
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'content_surface' AND e.enumlabel = 'testimonial_submissions'
  ) THEN
    ALTER TYPE "public"."content_surface" ADD VALUE 'testimonial_submissions';
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF to_regclass('public.age_experience_rules') IS NULL THEN
    IF to_regclass('public.age_experience_rules_id_seq') IS NOT NULL THEN
      DROP SEQUENCE "public"."age_experience_rules_id_seq";
    END IF;
    CREATE TABLE "age_experience_rules" (
    	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "age_experience_rules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
    	"title" varchar(255) NOT NULL,
    	"minAge" integer,
    	"maxAge" integer,
    	"isDefault" boolean DEFAULT false NOT NULL,
    	"uiPreset" varchar(32) DEFAULT 'standard' NOT NULL,
    	"fontSizeOption" varchar(16) DEFAULT 'default' NOT NULL,
    	"density" varchar(16) DEFAULT 'default' NOT NULL,
    	"hiddenSections" jsonb,
    	"createdBy" integer,
    	"updatedBy" integer,
    	"createdAt" timestamp DEFAULT now() NOT NULL,
    	"updatedAt" timestamp DEFAULT now() NOT NULL
    );
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF to_regclass('public.program_section_contents') IS NULL THEN
    IF to_regclass('public.program_section_contents_id_seq') IS NOT NULL THEN
      DROP SEQUENCE "public"."program_section_contents_id_seq";
    END IF;
    CREATE TABLE "program_section_contents" (
    	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "program_section_contents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
    	"sectionType" "session_type" NOT NULL,
    	"programTier" "program_type",
    	"title" varchar(255) NOT NULL,
    	"body" text NOT NULL,
    	"videoUrl" varchar(500),
    	"order" integer DEFAULT 1 NOT NULL,
    	"createdBy" integer NOT NULL,
    	"createdAt" timestamp DEFAULT now() NOT NULL,
    	"updatedAt" timestamp DEFAULT now() NOT NULL
    );
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE "user_locations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_locations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"accuracy" integer,
	"recordedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contents" ALTER COLUMN "body" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "profilePicture" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN IF NOT EXISTS "birthDate" date;--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN IF NOT EXISTS "profilePicture" text;--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN IF NOT EXISTS "ageList" jsonb;--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN IF NOT EXISTS "minAge" integer;--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN IF NOT EXISTS "maxAge" integer;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "category" varchar(100);--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "howTo" varchar(500);--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "progression" varchar(500);--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "regression" varchar(500);--> statement-breakpoint
ALTER TABLE "food_diary" ADD COLUMN IF NOT EXISTS "reviewedByCoach" integer;--> statement-breakpoint
ALTER TABLE "food_diary" ADD COLUMN IF NOT EXISTS "feedback" varchar(2000);--> statement-breakpoint
ALTER TABLE "food_diary" ADD COLUMN IF NOT EXISTS "reviewedAt" timestamp;--> statement-breakpoint
ALTER TABLE "guardians" ADD COLUMN IF NOT EXISTS "activeAthleteId" integer;--> statement-breakpoint
ALTER TABLE "parent_courses" ADD COLUMN IF NOT EXISTS "minAge" integer;--> statement-breakpoint
ALTER TABLE "parent_courses" ADD COLUMN IF NOT EXISTS "maxAge" integer;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "minAge" integer;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "maxAge" integer;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "monthlyPrice" varchar(100);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "yearlyPrice" varchar(100);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "discountType" varchar(20);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "discountValue" varchar(50);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "discountAppliesTo" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'age_experience_rules_createdBy_users_id_fk'
  ) THEN
    ALTER TABLE "age_experience_rules"
      ADD CONSTRAINT "age_experience_rules_createdBy_users_id_fk"
      FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'age_experience_rules_updatedBy_users_id_fk'
  ) THEN
    ALTER TABLE "age_experience_rules"
      ADD CONSTRAINT "age_experience_rules_updatedBy_users_id_fk"
      FOREIGN KEY ("updatedBy") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'program_section_contents_createdBy_users_id_fk'
  ) THEN
    ALTER TABLE "program_section_contents"
      ADD CONSTRAINT "program_section_contents_createdBy_users_id_fk"
      FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_locations_userId_users_id_fk'
  ) THEN
    ALTER TABLE "user_locations"
      ADD CONSTRAINT "user_locations_userId_users_id_fk"
      FOREIGN KEY ("userId") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'food_diary_reviewedByCoach_users_id_fk'
  ) THEN
    ALTER TABLE "food_diary"
      ADD CONSTRAINT "food_diary_reviewedByCoach_users_id_fk"
      FOREIGN KEY ("reviewedByCoach") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
