CREATE TABLE "athlete_injury_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "athlete_injury_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"athlete_id" integer NOT NULL,
	"logged_by_user_id" integer NOT NULL,
	"description" text NOT NULL,
	"body_part" varchar(100),
	"severity" varchar(20) NOT NULL DEFAULT 'mild',
	"occurred_at" date NOT NULL,
	"resolved_at" date,
	"notes" text,
	"created_at" timestamp NOT NULL DEFAULT now()
);

ALTER TABLE "athlete_injury_logs" ADD CONSTRAINT "athlete_injury_logs_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "athlete_injury_logs" ADD CONSTRAINT "athlete_injury_logs_logged_by_user_id_users_id_fk" FOREIGN KEY ("logged_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "injury_logs_athlete_idx" ON "athlete_injury_logs" ("athlete_id");
