CREATE TABLE "nutrition_onboarding_profiles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "nutrition_onboarding_profiles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"dietaryRequirements" text DEFAULT '' NOT NULL,
	"allergies" text DEFAULT '' NOT NULL,
	"generalNutritionHabits" text DEFAULT '' NOT NULL,
	"primaryGoal" varchar(120),
	"mealsPerDay" integer,
	"hydrationLitersPerDay" integer,
	"supplements" text,
	"medicalNotes" text,
	"additionalContext" text,
	"completedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nutrition_onboarding_profiles" ADD CONSTRAINT "nutrition_onboarding_profiles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "nutrition_onboarding_profiles_user_unique" ON "nutrition_onboarding_profiles" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "nutrition_onboarding_profiles_user_idx" ON "nutrition_onboarding_profiles" USING btree ("userId");
