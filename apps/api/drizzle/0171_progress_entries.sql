CREATE TABLE IF NOT EXISTS "progress_entries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "progress_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"clientId" varchar(64) NOT NULL,
	"userId" integer NOT NULL,
	"type" varchar(16) NOT NULL,
	"entryDate" varchar(10) NOT NULL,
	"exerciseName" varchar(120),
	"weightKg" double precision,
	"reps" integer,
	"sets" integer,
	"measureKind" varchar(16),
	"label" varchar(120),
	"valueCm" double precision,
	"notes" text DEFAULT '' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "progress_entries" ADD CONSTRAINT "progress_entries_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "progress_entries_client_id_user_unique" ON "progress_entries" USING btree ("clientId","userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "progress_entries_user_type_idx" ON "progress_entries" USING btree ("userId","type");
