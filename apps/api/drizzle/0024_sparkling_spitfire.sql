ALTER TYPE "public"."booking_type" ADD VALUE 'one_on_one';--> statement-breakpoint
ALTER TYPE "public"."content_surface" ADD VALUE 'legal';--> statement-breakpoint
ALTER TYPE "public"."content_surface" ADD VALUE 'announcements';--> statement-breakpoint
ALTER TYPE "public"."content_surface" ADD VALUE 'testimonial_submissions';--> statement-breakpoint
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
--> statement-breakpoint
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
ALTER TABLE "athletes" ADD COLUMN "birthDate" date;--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN "profilePicture" text;--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN "ageList" jsonb;--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN "minAge" integer;--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN "maxAge" integer;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "category" varchar(100);--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "howTo" varchar(500);--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "progression" varchar(500);--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "regression" varchar(500);--> statement-breakpoint
ALTER TABLE "food_diary" ADD COLUMN "reviewedByCoach" integer;--> statement-breakpoint
ALTER TABLE "food_diary" ADD COLUMN "feedback" varchar(2000);--> statement-breakpoint
ALTER TABLE "food_diary" ADD COLUMN "reviewedAt" timestamp;--> statement-breakpoint
ALTER TABLE "guardians" ADD COLUMN "activeAthleteId" integer;--> statement-breakpoint
ALTER TABLE "parent_courses" ADD COLUMN "minAge" integer;--> statement-breakpoint
ALTER TABLE "parent_courses" ADD COLUMN "maxAge" integer;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "minAge" integer;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "maxAge" integer;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "monthlyPrice" varchar(100);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "yearlyPrice" varchar(100);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "discountType" varchar(20);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "discountValue" varchar(50);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "discountAppliesTo" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tokenVersion" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "age_experience_rules" ADD CONSTRAINT "age_experience_rules_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "age_experience_rules" ADD CONSTRAINT "age_experience_rules_updatedBy_users_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_section_contents" ADD CONSTRAINT "program_section_contents_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_diary" ADD CONSTRAINT "food_diary_reviewedByCoach_users_id_fk" FOREIGN KEY ("reviewedByCoach") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;