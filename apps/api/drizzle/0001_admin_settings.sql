CREATE TABLE "admin_settings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"title" varchar(255),
	"bio" varchar(500),
	"timezone" varchar(100) DEFAULT 'Europe/London' NOT NULL,
	"notificationSummary" varchar(32) DEFAULT 'Weekly' NOT NULL,
	"workStartHour" integer DEFAULT 8 NOT NULL,
	"workStartMinute" integer DEFAULT 0 NOT NULL,
	"workEndHour" integer DEFAULT 18 NOT NULL,
	"workEndMinute" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "admin_settings_user_id_unique" ON "admin_settings" ("userId");
--> statement-breakpoint
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
