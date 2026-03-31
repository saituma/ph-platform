CREATE TABLE "training_module_tier_locks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "training_module_tier_locks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"audienceLabel" varchar(64) NOT NULL,
	"programTier" "public"."program_type" NOT NULL,
	"startModuleId" integer NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "training_module_tier_locks" ADD CONSTRAINT "training_module_tier_locks_startModuleId_training_modules_id_fk" FOREIGN KEY ("startModuleId") REFERENCES "public"."training_modules"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "training_module_tier_locks" ADD CONSTRAINT "training_module_tier_locks_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "training_module_tier_locks_audience_tier_unique" ON "training_module_tier_locks" USING btree ("audienceLabel","programTier");
--> statement-breakpoint
CREATE INDEX "training_module_tier_locks_audience_tier_idx" ON "training_module_tier_locks" USING btree ("audienceLabel","programTier");
--> statement-breakpoint
CREATE INDEX "training_module_tier_locks_module_idx" ON "training_module_tier_locks" USING btree ("startModuleId");
