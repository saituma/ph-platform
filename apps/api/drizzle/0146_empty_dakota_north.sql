CREATE TABLE "beta_testers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "beta_testers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "beta_testers_email_idx" ON "beta_testers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "beta_testers_created_at_idx" ON "beta_testers" USING btree ("created_at");