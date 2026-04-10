CREATE TABLE "nutrition_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "nutrition_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"dateKey" varchar(10) NOT NULL,
	"athleteType" varchar(20) DEFAULT 'youth' NOT NULL,
	"breakfast" text,
	"snacks" text,
	"lunch" text,
	"dinner" text,
	"waterIntake" integer DEFAULT 0,
	"mood" integer,
	"energy" integer,
	"pain" integer,
	"foodDiary" text,
	"coachFeedback" text,
	"coachId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nutrition_targets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "nutrition_targets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"calories" integer,
	"protein" integer,
	"carbs" integer,
	"fats" integer,
	"micronutrientsGuidance" text,
	"updatedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD CONSTRAINT "nutrition_logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD CONSTRAINT "nutrition_logs_coachId_users_id_fk" FOREIGN KEY ("coachId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_targets" ADD CONSTRAINT "nutrition_targets_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_targets" ADD CONSTRAINT "nutrition_targets_updatedBy_users_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "nutrition_logs_user_date_unique" ON "nutrition_logs" USING btree ("userId","dateKey");--> statement-breakpoint
CREATE INDEX "nutrition_logs_user_idx" ON "nutrition_logs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "nutrition_logs_date_idx" ON "nutrition_logs" USING btree ("dateKey");--> statement-breakpoint
CREATE UNIQUE INDEX "nutrition_targets_user_unique" ON "nutrition_targets" USING btree ("userId");