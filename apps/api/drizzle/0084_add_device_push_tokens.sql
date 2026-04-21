ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "devicePushToken" text;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "devicePushTokenType" varchar(20);

