CREATE TABLE IF NOT EXISTS "wellbeing_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wellbeing_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"date_key" varchar(10) NOT NULL,
	"mood" integer NOT NULL,
	"energy" integer NOT NULL,
	"pain" integer NOT NULL,
	"notes" text,
	"coach_feedback" text,
	"coach_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wellbeing_logs" ADD CONSTRAINT "wellbeing_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wellbeing_logs" ADD CONSTRAINT "wellbeing_logs_coach_id_user_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wellbeing_logs_user_date_unique" ON "wellbeing_logs" USING btree ("user_id","date_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wellbeing_logs_user_idx" ON "wellbeing_logs" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wellbeing_logs_date_idx" ON "wellbeing_logs" USING btree ("date_key");
