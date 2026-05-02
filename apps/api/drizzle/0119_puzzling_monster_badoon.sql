DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enquiry_service') THEN CREATE TYPE "public"."enquiry_service" AS ENUM('1-to-1 Private', 'Semi-Private (2-4)', 'Team Sessions', 'App Only'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enquiry_status') THEN CREATE TYPE "public"."enquiry_status" AS ENUM('new', 'contacted', 'booked', 'closed'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracking_goal_audience') THEN CREATE TYPE "public"."tracking_goal_audience" AS ENUM('adult', 'premium_team', 'all'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracking_goal_scope') THEN CREATE TYPE "public"."tracking_goal_scope" AS ENUM('all', 'individual'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracking_goal_status') THEN CREATE TYPE "public"."tracking_goal_status" AS ENUM('active', 'archived'); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracking_goal_unit') THEN CREATE TYPE "public"."tracking_goal_unit" AS ENUM('km', 'sec', 'min', 'reps', 'custom'); END IF; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enquiries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "enquiries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"athlete_type" varchar(10),
	"athlete_name" varchar(255) NOT NULL,
	"age" integer,
	"parent_name" varchar(255),
	"phone" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"interested_in" "enquiry_service" NOT NULL,
	"location_preference" jsonb DEFAULT '[]'::jsonb,
	"group_needed" boolean DEFAULT false NOT NULL,
	"team_name" varchar(255),
	"age_group" varchar(50),
	"squad_size" integer,
	"availability_days" jsonb DEFAULT '[]'::jsonb,
	"availability_time" varchar(100),
	"goal" text,
	"photo_url" varchar(1024),
	"status" "enquiry_status" DEFAULT 'new' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tracking_goals" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tracking_goals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"coachId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" varchar(500),
	"unit" "tracking_goal_unit" DEFAULT 'km' NOT NULL,
	"customUnit" varchar(50),
	"targetValue" double precision NOT NULL,
	"scope" "tracking_goal_scope" DEFAULT 'all' NOT NULL,
	"athleteId" integer,
	"audience" "tracking_goal_audience" DEFAULT 'adult' NOT NULL,
	"teamId" integer,
	"dueDate" date,
	"status" "tracking_goal_status" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "subscription_plans" ALTER COLUMN "tier" DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN IF NOT EXISTS "current_plan_id" integer;--> statement-breakpoint
ALTER TABLE "guardians" ADD COLUMN IF NOT EXISTS "current_plan_id" integer;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "duration_weeks" integer;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "duration_weeks_price" integer;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "duration_days_per_week" integer;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "duration_days_price" integer;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "tracking_goals" ADD CONSTRAINT "tracking_goals_coachId_users_id_fk" FOREIGN KEY ("coachId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "tracking_goals" ADD CONSTRAINT "tracking_goals_athleteId_athletes_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "tracking_goals" ADD CONSTRAINT "tracking_goals_teamId_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enquiries_status_idx" ON "enquiries" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enquiries_service_idx" ON "enquiries" USING btree ("interested_in");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enquiries_created_at_idx" ON "enquiries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tracking_goals_coach_idx" ON "tracking_goals" USING btree ("coachId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tracking_goals_athlete_idx" ON "tracking_goals" USING btree ("athleteId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tracking_goals_status_idx" ON "tracking_goals" USING btree ("status");