CREATE TABLE IF NOT EXISTS "preseason_programme_assignments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "preseason_programme_assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"programmeId" integer NOT NULL,
	"athleteId" integer NOT NULL,
	"assignedBy" integer NOT NULL,
	"assignedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "preseason_programme_assignments" ADD CONSTRAINT "preseason_programme_assignments_programmeId_preseason_programmes_id_fk" FOREIGN KEY ("programmeId") REFERENCES "public"."preseason_programmes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preseason_programme_assignments" ADD CONSTRAINT "preseason_programme_assignments_athleteId_athletes_id_fk" FOREIGN KEY ("athleteId") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preseason_programme_assignments" ADD CONSTRAINT "preseason_programme_assignments_assignedBy_users_id_fk" FOREIGN KEY ("assignedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "preseason_assignments_programme_athlete_unique" ON "preseason_programme_assignments" USING btree ("programmeId","athleteId");--> statement-breakpoint
CREATE INDEX "preseason_assignments_programme_idx" ON "preseason_programme_assignments" USING btree ("programmeId");--> statement-breakpoint
CREATE INDEX "preseason_assignments_athlete_idx" ON "preseason_programme_assignments" USING btree ("athleteId");
