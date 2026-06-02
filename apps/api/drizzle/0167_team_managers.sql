CREATE TYPE "public"."team_manager_role" AS ENUM('co_manager');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_managers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "team_managers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"teamId" integer NOT NULL,
	"userId" integer NOT NULL,
	"role" "team_manager_role" DEFAULT 'co_manager' NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "team_managers" ADD CONSTRAINT "team_managers_teamId_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_managers" ADD CONSTRAINT "team_managers_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_managers" ADD CONSTRAINT "team_managers_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "team_managers_team_user_unique" ON "team_managers" USING btree ("teamId","userId");--> statement-breakpoint
CREATE INDEX "team_managers_team_id_idx" ON "team_managers" USING btree ("teamId");--> statement-breakpoint
CREATE INDEX "team_managers_user_id_idx" ON "team_managers" USING btree ("userId");
