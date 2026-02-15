ALTER TABLE "users" ADD COLUMN "passwordHash" varchar(255);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "passwordSalt" varchar(255);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "emailVerified" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verificationCode" varchar(10);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verificationExpiresAt" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verificationAttempts" integer DEFAULT 0 NOT NULL;
