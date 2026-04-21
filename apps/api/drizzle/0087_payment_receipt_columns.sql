ALTER TABLE "subscription_requests" ADD COLUMN IF NOT EXISTS "receiptPublicId" varchar(36);
ALTER TABLE "subscription_requests" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" varchar(255);
ALTER TABLE "subscription_requests" ADD COLUMN IF NOT EXISTS "paymentAmountCents" integer;
ALTER TABLE "subscription_requests" ADD COLUMN IF NOT EXISTS "paymentCurrency" varchar(10);
--> statement-breakpoint
ALTER TABLE "team_subscription_requests" ADD COLUMN IF NOT EXISTS "receiptPublicId" varchar(36);
ALTER TABLE "team_subscription_requests" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" varchar(255);
--> statement-breakpoint
UPDATE "subscription_requests" SET "receiptPublicId" = gen_random_uuid()::text WHERE "receiptPublicId" IS NULL;
UPDATE "team_subscription_requests" SET "receiptPublicId" = gen_random_uuid()::text WHERE "receiptPublicId" IS NULL;
--> statement-breakpoint
ALTER TABLE "subscription_requests" ALTER COLUMN "receiptPublicId" SET NOT NULL;
ALTER TABLE "team_subscription_requests" ALTER COLUMN "receiptPublicId" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_requests_receipt_public_uid" ON "subscription_requests" USING btree ("receiptPublicId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "team_subscription_requests_receipt_public_uid" ON "team_subscription_requests" USING btree ("receiptPublicId");
