ALTER TABLE "users" ADD COLUMN "isBlocked" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "isDeleted" boolean DEFAULT false NOT NULL;
