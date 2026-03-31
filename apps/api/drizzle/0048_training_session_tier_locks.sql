CREATE TABLE "training_session_tier_locks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "training_session_tier_locks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"moduleId" integer NOT NULL,
	"programTier" "public"."program_type" NOT NULL,
	"startSessionId" integer NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "training_session_tier_locks" ADD CONSTRAINT "training_session_tier_locks_moduleId_training_modules_id_fk" FOREIGN KEY ("moduleId") REFERENCES "public"."training_modules"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "training_session_tier_locks" ADD CONSTRAINT "training_session_tier_locks_startSessionId_training_module_sessions_id_fk" FOREIGN KEY ("startSessionId") REFERENCES "public"."training_module_sessions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "training_session_tier_locks" ADD CONSTRAINT "training_session_tier_locks_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "training_session_tier_locks_module_tier_unique" ON "training_session_tier_locks" USING btree ("moduleId","programTier");
--> statement-breakpoint
CREATE INDEX "training_session_tier_locks_module_tier_idx" ON "training_session_tier_locks" USING btree ("moduleId","programTier");
--> statement-breakpoint
CREATE INDEX "training_session_tier_locks_session_idx" ON "training_session_tier_locks" USING btree ("startSessionId");
