ALTER TABLE "service_types" ADD COLUMN "isBookable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "stripePriceIdOneTime" varchar(255);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "oneTimePrice" varchar(100);