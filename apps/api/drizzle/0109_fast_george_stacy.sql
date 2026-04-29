CREATE TABLE "portal_configs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal_configs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"hero" jsonb,
	"features" jsonb,
	"testimonials" jsonb,
	"cta" jsonb,
	"footer" jsonb,
	"updatedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "features" jsonb;--> statement-breakpoint
ALTER TABLE "portal_configs" ADD CONSTRAINT "portal_configs_updatedBy_users_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;